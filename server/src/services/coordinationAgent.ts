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
import { AllocationAgent } from './allocationAgent.js';

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
  }> {
    const id = incidentData.id || `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const assessment = await NeedsAssessmentAgent.assessIncidentAsync(incidentData);

    const incident: IIncident = {
      id,
      title: incidentData.title || 'Emergency Incident Report',
      description: incidentData.description || 'Distress signal received from field.',
      category: incidentData.category || 'FLOOD',
      severity: incidentData.severity || 'HIGH',
      status: 'REPORTED',
      latitude: incidentData.latitude || 19.0760,
      longitude: incidentData.longitude || 72.8777,
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
}
