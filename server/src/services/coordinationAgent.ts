import { Server as SocketIOServer } from 'socket.io';
import {
  IIncident,
  IResource,
  IShelter,
  IAllocation,
  IAuditEvent,
  IAlert,
  IBroadcast,
} from '../models/types.js';
import { repository } from '../utils/repository.js';
import { NeedsAssessmentAgent } from './needsAssessmentAgent.js';
import { AllocationAgent, calculateHaversineDistance } from './allocationAgent.js';

let ioInstance: SocketIOServer | null = null;

export function setSocketServer(io: SocketIOServer) {
  ioInstance = io;
}

export function emitEvent(eventName: string, payload: any) {
  if (ioInstance) {
    ioInstance.emit(eventName, payload);
  }
}

export class CoordinationAgent {
  public static async logAudit(
    action: string,
    description: string,
    entityType?: 'INCIDENT' | 'RESOURCE' | 'SHELTER' | 'ALLOCATION' | 'ALERT' | 'BROADCAST',
    incidentId?: string,
    resourceId?: string,
    actor: string = 'EOC Coordination Engine'
  ): Promise<IAuditEvent> {
    const audit: IAuditEvent = {
      id: `AUD-${Math.floor(500 + Math.random() * 9500)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      incidentId,
      resourceId,
      description,
    };
    await repository.saveAuditEvent(audit);
    emitEvent('audit.created', audit);
    return audit;
  }

  public static async handleNewIncident(incidentData: Partial<IIncident>): Promise<{
    incident: IIncident;
    assessment: Awaited<ReturnType<typeof NeedsAssessmentAgent.assessIncidentAsync>>;
    recommendation?: any;
    isDuplicateMerged?: boolean;
    mergedIntoIncidentId?: string;
  }> {
    const existingIncidents = await repository.getIncidents();
    const activeIncidents = existingIncidents.filter(
      (i) => i.status !== 'RESOLVED' && i.status !== 'CANCELLED'
    );

    const newLat = incidentData.latitude || 19.0760;
    const newLon = incidentData.longitude || 72.8777;
    const newCategory = incidentData.category || 'FLOOD';

    // Duplication Collision Check: 0.5 km (500m) radius and matching category or title keyword
    const duplicateCollision = activeIncidents.find((existing) => {
      const distKm = calculateHaversineDistance(existing.latitude, existing.longitude, newLat, newLon);
      const sameCategory = existing.category === newCategory;
      const titleKeyword = incidentData.title ? incidentData.title.split(' ')[0] : '';
      const similarTitle = titleKeyword.length > 3 && existing.title.toLowerCase().includes(titleKeyword.toLowerCase());

      return distKm <= 0.5 && (sameCategory || similarTitle);
    });

    if (duplicateCollision) {
      // Merge duplicate report into existing active incident
      duplicateCollision.peopleTrapped = (duplicateCollision.peopleTrapped || 0) + (incidentData.peopleTrapped || 0);
      duplicateCollision.injured = (duplicateCollision.injured || 0) + (incidentData.injured || 0);
      duplicateCollision.peopleAffected = Math.max(
        duplicateCollision.peopleAffected || 1,
        (duplicateCollision.peopleAffected || 0) + (incidentData.peopleAffected || 1)
      );

      if (incidentData.description && !duplicateCollision.description.includes(incidentData.description)) {
        duplicateCollision.description += ` | [Duplicate Field Report]: ${incidentData.description}`;
      }

      // Re-assess live AI triage with updated casualty metrics
      const updatedAssessment = await NeedsAssessmentAgent.assessIncidentAsync(duplicateCollision);
      duplicateCollision.aiAssessment = updatedAssessment;
      duplicateCollision.requiredResources = Array.from(
        new Set([...(duplicateCollision.requiredResources || []), ...updatedAssessment.recommendedResourceTypes])
      );

      await repository.saveIncident(duplicateCollision);

      emitEvent('incident.updated', duplicateCollision);
      emitEvent('incident.duplicate_merged', {
        existingIncidentId: duplicateCollision.id,
        mergedReport: incidentData,
        mergedIncident: duplicateCollision,
      });

      await this.logAudit(
        'INCIDENT_MERGED_DUPLICATE',
        `Duplicate report merged into existing incident ${duplicateCollision.id} (500m collision radius). Trapped: ${duplicateCollision.peopleTrapped}, Injured: ${duplicateCollision.injured}.`,
        'INCIDENT',
        duplicateCollision.id,
        undefined,
        incidentData.source || 'Citizen Reporter Portal'
      );

      return {
        incident: duplicateCollision,
        assessment: updatedAssessment,
        isDuplicateMerged: true,
        mergedIntoIncidentId: duplicateCollision.id,
      };
    }

    const id = incidentData.id || `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const assessment = await NeedsAssessmentAgent.assessIncidentAsync(incidentData);

    const incident: IIncident = {
      id,
      title: incidentData.title || 'Emergency Incident Report',
      description: incidentData.description || 'Distress signal received from field.',
      category: incidentData.category || 'FLOOD',
      severity: incidentData.severity || 'HIGH',
      status: 'REPORTED',
      latitude: newLat,
      longitude: newLon,
      reportedAt: new Date().toISOString(),
      peopleAffected: incidentData.peopleAffected || 1,
      peopleTrapped: incidentData.peopleTrapped || 0,
      injured: incidentData.injured || 0,
      requiredResources: assessment.recommendedResourceTypes,
      assignedResources: [],
      source: incidentData.source || 'Citizen Reporter Portal',
      photoUrl: incidentData.photoUrl,
      aiAssessment: assessment,
      eta: 15,
    };

    await repository.saveIncident(incident);
    emitEvent('incident.created', incident);
    emitEvent('incident.assessed', { incidentId: incident.id, assessment });

    await this.logAudit(
      'INCIDENT_CREATED',
      `New incident registered: ${incident.title} (${incident.severity})`,
      'INCIDENT',
      incident.id,
      undefined,
      incident.source
    );

    // Auto-recommend optimal resource
    const recommendation = await AllocationAgent.recommendAllocation(incident);
    if (recommendation) {
      emitEvent('allocation.recommended', {
        incidentId: incident.id,
        recommendation,
      });
    }

    return { incident, assessment, recommendation };
  }

  public static async dispatchResource(
    incidentId: string,
    resourceId: string,
    needType?: string,
    notes?: string
  ): Promise<{ incident: IIncident; resource: IResource; allocation: IAllocation } | null> {
    const incident = await repository.getIncidentById(incidentId);
    const resource = await repository.getResourceById(resourceId);

    if (!incident || !resource) return null;

    // Recommendation check for distance/ETA
    const rec = await AllocationAgent.recommendAllocation(incident, resource.type);
    const distance = rec ? rec.distance : 3.5;
    const eta = rec ? rec.eta : 15;
    const priorityScore = incident.aiAssessment?.priorityScore || 80;

    // Update Resource
    resource.status = 'EN_ROUTE';
    resource.currentAssignment = incidentId;
    resource.assignedIncidentId = incidentId;
    resource.destination = incident.title;
    resource.eta = eta;
    await repository.saveResource(resource);

    // Update Incident
    if (!incident.assignedResources.includes(resourceId)) {
      incident.assignedResources.push(resourceId);
    }
    incident.status = 'DISPATCHED';
    incident.eta = eta;
    await repository.saveIncident(incident);

    // Create Allocation
    const allocation = await AllocationAgent.createAllocationRecord(
      incidentId,
      resourceId,
      needType || resource.type,
      priorityScore,
      distance,
      eta,
      notes || `Dispatched by EOC Command to ${incident.title}`
    );

    emitEvent('resource.dispatched', { incidentId, resourceId, resource, incident });
    emitEvent('allocation.created', allocation);
    emitEvent('incident.updated', incident);

    await this.logAudit(
      'RESOURCE_DISPATCHED',
      `Unit ${resource.name} dispatched to incident ${incidentId} (ETA: ${eta}m)`,
      'ALLOCATION',
      incidentId,
      resourceId
    );

    return { incident, resource, allocation };
  }

  public static async reallocateResource(
    oldResourceId: string,
    newResourceId: string,
    incidentId: string
  ): Promise<{ incident: IIncident; oldResource: IResource; newResource: IResource; allocation: IAllocation } | null> {
    const incident = await repository.getIncidentById(incidentId);
    const oldResource = await repository.getResourceById(oldResourceId);
    const newResource = await repository.getResourceById(newResourceId);

    if (!incident || !oldResource || !newResource) return null;

    // Release old resource
    oldResource.status = 'AVAILABLE';
    oldResource.currentAssignment = undefined;
    oldResource.assignedIncidentId = undefined;
    oldResource.destination = undefined;
    oldResource.eta = undefined;
    await repository.saveResource(oldResource);

    // Assign new resource
    const rec = await AllocationAgent.recommendAllocation(incident, newResource.type);
    const distance = rec ? rec.distance : 4.0;
    const eta = rec ? rec.eta : 15;
    newResource.status = 'EN_ROUTE';
    newResource.currentAssignment = incidentId;
    newResource.assignedIncidentId = incidentId;
    newResource.destination = incident.title;
    newResource.eta = eta;
    await repository.saveResource(newResource);

    // Update active allocations
    const allAllocations = await repository.getAllocations();
    const activeAllocations = allAllocations.filter(
      (a) => a.incidentId === incidentId && a.resourceId === oldResourceId && a.status === 'ACTIVE'
    );
    
    for (const a of activeAllocations) {
      a.status = 'REALLOCATED';
      await repository.saveAllocation(a);
    }

    // Create new allocation
    const newAllocation = await AllocationAgent.createAllocationRecord(
      incidentId,
      newResourceId,
      newResource.type,
      incident.aiAssessment?.priorityScore || 80,
      distance,
      eta,
      `Reallocated replacement unit for ${oldResource.name}`
    );

    // Update Incident assigned list
    incident.assignedResources = incident.assignedResources.filter((r) => r !== oldResourceId);
    if (!incident.assignedResources.includes(newResourceId)) {
      incident.assignedResources.push(newResourceId);
    }
    await repository.saveIncident(incident);

    emitEvent('resource.reallocated', {
      incidentId,
      oldResourceId,
      newResourceId,
      allocation: newAllocation,
    });
    emitEvent('incident.updated', incident);

    await this.logAudit(
      'RESOURCE_REALLOCATED',
      `Reallocated unit from ${oldResource.name} to ${newResource.name} for incident ${incidentId}`,
      'ALLOCATION',
      incidentId,
      newResourceId
    );

    return { incident, oldResource, newResource, allocation: newAllocation };
  }

  public static async resetMockState(): Promise<{
    incidents: IIncident[];
    resources: IResource[];
  }> {
    const sampleIncidents = [
      {
        title: 'Severe Flash Flood & Trapped Residents',
        category: 'FLOOD' as const,
        description: 'Rapid water level rise submerging ground levels in urban residential sector.',
      },
      {
        title: 'Hospital Emergency Power Grid & Battery Failure',
        category: 'POWER_OUTAGE' as const,
        description: 'Main transformer blackout endangering ICU and surgical trauma units.',
      },
      {
        title: 'Hillside Landslide Blocking Primary Evacuation Route',
        category: 'LANDSLIDE' as const,
        description: 'Heavy mud and boulder debris obstructing primary transit corridor.',
      },
      {
        title: 'Chemical Storage Facility Toxic Vapor Rupture',
        category: 'HAZMAT' as const,
        description: 'Storage tank valve rupture releasing airborne hazardous plume.',
      },
      {
        title: 'Commercial Complex Structural Column Collapse',
        category: 'STRUCTURAL_COLLAPSE' as const,
        description: 'Lower floor beam failure trapping maintenance personnel inside.',
      },
      {
        title: 'Brush Wildfire Ignition Near Perimeter Suburb',
        category: 'WILDFIRE' as const,
        description: 'High winds pushing perimeter fire towards residential structures.',
      },
      {
        title: 'Substation Explosion & District Blackout',
        category: 'POWER_OUTAGE' as const,
        description: 'Electrical explosion disrupting municipal water pumps and emergency shelters.',
      },
      {
        title: 'Coastal Tidal Surge Inundating Bus & Transit Depot',
        category: 'FLOOD' as const,
        description: 'High tide surge overflowing sea wall into central transit station.',
      },
    ];

    const severities: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    // Center coordinates for disaster response region
    const baseLat = 19.0760;
    const baseLon = 72.8777;

    // Pick 4 to 6 random incidents
    const count = 4 + Math.floor(Math.random() * 3);
    const shuffled = [...sampleIncidents].sort(() => 0.5 - Math.random()).slice(0, count);

    const generatedIncidents: IIncident[] = [];

    for (let i = 0; i < shuffled.length; i++) {
      const sample = shuffled[i];
      const severity = i === 0 ? 'CRITICAL' : severities[Math.floor(Math.random() * severities.length)];
      const trapped = Math.floor(6 + Math.random() * 35);
      const injured = Math.floor(Math.random() * 12);
      const latOffset = (Math.random() - 0.5) * 0.08;
      const lonOffset = (Math.random() - 0.5) * 0.09;

      const incData: Partial<IIncident> = {
        id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `${sample.title} - Sector ${Math.floor(1 + Math.random() * 12)}`,
        description: sample.description,
        category: sample.category,
        severity,
        latitude: parseFloat((baseLat + latOffset).toFixed(4)),
        longitude: parseFloat((baseLon + lonOffset).toFixed(4)),
        peopleAffected: trapped * 4 + Math.floor(Math.random() * 100),
        peopleTrapped: trapped,
        injured,
        source: 'Automated Mock Radar Simulator',
      };

      const assessment = await NeedsAssessmentAgent.assessIncidentAsync(incData);

      const incident: IIncident = {
        id: incData.id!,
        title: incData.title!,
        description: incData.description!,
        category: incData.category!,
        severity: incData.severity!,
        status: 'REPORTED',
        latitude: incData.latitude!,
        longitude: incData.longitude!,
        reportedAt: new Date(Date.now() - Math.floor(Math.random() * 20 * 60 * 1000)).toISOString(),
        peopleAffected: incData.peopleAffected!,
        peopleTrapped: incData.peopleTrapped!,
        injured: incData.injured!,
        requiredResources: assessment.recommendedResourceTypes,
        assignedResources: [],
        source: incData.source!,
        aiAssessment: assessment,
        eta: 15,
      };

      generatedIncidents.push(incident);
    }

    // Save to repository
    await repository.setIncidents(generatedIncidents);

    // Reset resource assignments to AVAILABLE
    const resources = await repository.getResources();
    for (const r of resources) {
      r.status = 'AVAILABLE';
      r.currentAssignment = undefined;
      r.assignedIncidentId = undefined;
      r.destination = undefined;
      r.eta = undefined;
      await repository.saveResource(r);
    }

    await this.logAudit(
      'MOCK_STATE_RESET',
      `Wiped existing live incidents and randomly generated ${generatedIncidents.length} new incidents in target sector.`,
      'INCIDENT'
    );

    emitEvent('incidents.reset', generatedIncidents);
    emitEvent('resources.updated', resources);

    return { incidents: generatedIncidents, resources };
  }
}
