import { io, Socket } from 'socket.io-client';
import {
  Incident,
  ResourceUnit,
  Shelter,
  Allocation,
  SystemAlert,
  BroadcastMessage,
  AuditEvent,
  IncidentStatus,
  EmergencyPlace,
} from '../types';

const API_BASE = 'http://localhost:5000/api';
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
  }
  return socket;
};

export function normalizeIncident(inc: any): Incident {
  if (!inc) return inc;

  const lat = inc.location?.lat ?? inc.latitude ?? 19.076;
  const lng = inc.location?.lng ?? inc.longitude ?? 72.8777;
  const address = inc.location?.address ?? inc.address ?? inc.title ?? 'Disaster Sector';
  const zone = inc.location?.zone ?? inc.zone ?? 'Metro Disaster Zone';

  const strandedCount = inc.strandedCount ?? inc.peopleTrapped ?? inc.peopleAffected ?? 0;
  const injuredCount = inc.injuredCount ?? inc.injured ?? 0;
  const dispatchedUnitIds = inc.dispatchedUnitIds ?? inc.assignedResources ?? [];
  const aiPriorityScore = inc.aiPriorityScore ?? inc.aiAssessment?.priorityScore ?? 50;
  const zoneScore = inc.zoneScore ?? inc.aiAssessment?.zoneScore;
  const peopleAffectedScore = inc.peopleAffectedScore ?? inc.aiAssessment?.peopleAffectedScore;
  const disasterTypeScore = inc.disasterTypeScore ?? inc.aiAssessment?.disasterTypeScore;
  const urgencyKeywordScore = inc.urgencyKeywordScore ?? inc.aiAssessment?.urgencyKeywordScore;
  const detectedKeywords = inc.detectedKeywords ?? inc.aiAssessment?.detectedKeywords;
  const urgencyReasoning = inc.urgencyReasoning ?? inc.aiAssessment?.urgencyReasoning;
  const urgentNeeds = inc.urgentNeeds ?? inc.requiredResources ?? [];
  const reportedBy = inc.reportedBy ?? inc.source ?? 'Field Reporter';
  const etaMinutes = inc.etaMinutes ?? inc.eta;

  return {
    id: inc.id || `INC-${Date.now()}`,
    title: inc.title || 'Untitled Incident',
    category: inc.category || 'FLOOD',
    severity: inc.severity || 'MEDIUM',
    status: inc.status || 'REPORTED',
    location: { lat, lng, address, zone },
    reportedAt: inc.reportedAt || new Date().toISOString(),
    reportedBy,
    strandedCount,
    injuredCount,
    urgentNeeds,
    description: inc.description || '',
    dispatchedUnitIds,
    aiPriorityScore,
    zoneScore,
    peopleAffectedScore,
    disasterTypeScore,
    urgencyKeywordScore,
    detectedKeywords,
    urgencyReasoning,
    aiAssessment: inc.aiAssessment,
    etaMinutes,
  };
}

export function normalizeResource(res: any): ResourceUnit {
  if (!res) return res;

  const lat = res.currentLocation?.lat ?? res.latitude ?? 19.076;
  const lng = res.currentLocation?.lng ?? res.longitude ?? 72.8777;
  const address = res.currentLocation?.address ?? res.address ?? res.agency ?? 'Base Station';
  const zone = res.currentLocation?.zone ?? res.zone ?? 'Central Zone';

  const callsign = res.callsign ?? res.name ?? res.id;
  const category = res.category ?? res.type ?? 'SEARCH_RESCUE';
  const personnelCount = res.personnelCount ?? res.capacity ?? 5;
  const fuelOrSupplyPct = res.fuelOrSupplyPct ?? 100;
  const contactChannel = res.contactChannel ?? 'CH-16';
  const etaMinutes = res.etaMinutes ?? res.eta;

  return {
    id: res.id,
    callsign,
    category,
    status: res.status || 'AVAILABLE',
    personnelCount,
    currentLocation: { lat, lng, address, zone },
    assignedIncidentId: res.assignedIncidentId || res.currentAssignment,
    fuelOrSupplyPct,
    contactChannel,
    etaMinutes,
  };
}

export function normalizeShelter(shl: any): Shelter {
  if (!shl) return shl;

  const lat = shl.location?.lat ?? shl.latitude ?? 19.076;
  const lng = shl.location?.lng ?? shl.longitude ?? 72.8777;
  const address = shl.location?.address ?? shl.address ?? shl.name ?? 'Emergency Shelter';
  const zone = shl.location?.zone ?? shl.zone ?? 'Safe Zone';

  const foodSupplyDays = shl.supplies?.foodDays ?? shl.foodSupplyDays ?? shl.foodSupply ?? 3;
  const waterSupplyDays = shl.supplies?.waterDays ?? shl.waterSupplyDays ?? shl.waterSupply ?? 3;
  const medicalStaffCount = shl.medicalStaffCount ?? shl.medicalStaff ?? 2;
  const occupied = shl.currentOccupancy ?? shl.occupied ?? 0;

  return {
    id: shl.id,
    name: shl.name || 'Shelter Facility',
    location: { lat, lng, address, zone },
    capacity: shl.capacity ?? 100,
    currentOccupancy: occupied,
    occupied,
    medicalStaffCount,
    supplies: {
      waterDays: waterSupplyDays,
      foodDays: foodSupplyDays,
      medicalKits: shl.supplies?.medicalKits ?? 50,
    },
    contactPhone: shl.contactPhone || '108',
    isOpen: shl.isOpen ?? (shl.status !== 'CLOSED'),
    status: shl.status || 'OPEN',
  };
}

export function normalizeAllocation(alc: any): Allocation {
  if (!alc) return alc;
  const dispatchedAt = alc.dispatchedAt || alc.allocatedAt || new Date().toISOString();
  return {
    id: alc.id,
    incidentId: alc.incidentId,
    resourceId: alc.resourceId,
    dispatchedAt,
    allocatedAt: dispatchedAt,
    status: alc.status || 'ACTIVE',
    etaMinutes: alc.etaMinutes ?? alc.eta ?? 0,
    routePolyline: alc.routePolyline || alc.geometry?.coordinates,
    notes: alc.notes,
  };
}

export const apiService = {
  // REST Getters with fallback to local state if backend unreachable
  fetchIncidents: async (): Promise<Incident[]> => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeIncident) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline, using local cache', e);
    }
    return [];
  },

  fetchResources: async (): Promise<ResourceUnit[]> => {
    try {
      const res = await fetch(`${API_BASE}/resources`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeResource) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchShelters: async (): Promise<Shelter[]> => {
    try {
      const res = await fetch(`${API_BASE}/shelters`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeShelter) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAlerts: async (): Promise<SystemAlert[]> => {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAuditEvents: async (): Promise<AuditEvent[]> => {
    try {
      const res = await fetch(`${API_BASE}/audit`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchBroadcasts: async (): Promise<BroadcastMessage[]> => {
    try {
      const res = await fetch(`${API_BASE}/broadcasts`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAllocations: async (): Promise<Allocation[]> => {
    try {
      const res = await fetch(`${API_BASE}/allocations`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeAllocation) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAnalytics: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline for analytics', e);
    }
    return null;
  },

  fetchIncidentById: async (id: string): Promise<Incident | null> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`);
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncident(raw);
      }
    } catch (e) {
      console.warn(`Failed to fetch incident ${id}`, e);
    }
    return null;
  },

  fetchResourceById: async (id: string): Promise<ResourceUnit | null> => {
    try {
      const res = await fetch(`${API_BASE}/resources/${id}`);
      if (res.ok) {
        const raw = await res.json();
        return normalizeResource(raw);
      }
    } catch (e) {
      console.warn(`Failed to fetch resource ${id}`, e);
    }
    return null;
  },

  fetchShelterById: async (id: string): Promise<Shelter | null> => {
    try {
      const res = await fetch(`${API_BASE}/shelters/${id}`);
      if (res.ok) {
        const raw = await res.json();
        return normalizeShelter(raw);
      }
    } catch (e) {
      console.warn(`Failed to fetch shelter ${id}`, e);
    }
    return null;
  },

  fetchRouteEstimate: async (
    originLat: number,
    originLon: number,
    destinationLat: number,
    destinationLon: number
  ): Promise<any> => {
    try {
      const res = await fetch(
        `${API_BASE}/routes/estimate?originLat=${originLat}&originLon=${originLon}&destinationLat=${destinationLat}&destinationLon=${destinationLon}`
      );
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch route estimate', e);
    }
    return null;
  },

  fetchWeather: async (lat: number, lon: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch weather intelligence', e);
    }
    return null;
  },

  fetchNearbyEmergencyPlaces: async (
    lat: number,
    lon: number,
    radius: number = 5000
  ): Promise<{ success: boolean; places: EmergencyPlace[]; error?: string }> => {
    try {
      const res = await fetch(
        `${API_BASE}/emergency-places/nearby?lat=${lat}&lon=${lon}&radius=${radius}`
      );
      if (res.ok) {
        const json = await res.json();
        return {
          success: json.success ?? true,
          places: Array.isArray(json.places) ? json.places : [],
          error: json.error,
        };
      }
    } catch (e: any) {
      console.warn('Failed to fetch nearby emergency support places', e);
    }
    return {
      success: false,
      places: [],
      error: 'Nearby emergency services temporarily unavailable',
    };
  },

  // Actions
  createIncident: async (incident: Partial<Incident>): Promise<Incident | null> => {
    try {
      const payload = {
        title: incident.title,
        description: incident.description,
        category: incident.category,
        severity: incident.severity,
        latitude: incident.location?.lat ?? 19.076,
        longitude: incident.location?.lng ?? 72.8777,
        peopleAffected: (incident.strandedCount || 0) + (incident.injuredCount || 0) + 10,
        peopleTrapped: incident.strandedCount || 0,
        injured: incident.injuredCount || 0,
        source: incident.reportedBy || 'FIELD_REPORTER',
      };
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncident(raw);
      }
    } catch (e) {
      console.error('Failed to create incident via REST API', e);
    }
    return null;
  },

  updateIncidentStatus: async (id: string, status: IncidentStatus): Promise<Incident | null> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncident(raw);
      }
    } catch (e) {
      console.error('Failed to update incident status via REST API', e);
    }
    return null;
  },

  dispatchResource: async (incidentId: string, resourceId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/resources/${resourceId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to dispatch resource via REST API', e);
    }
    return null;
  },

  reallocateResource: async (oldResourceId: string, newResourceId: string, incidentId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/allocations/ALC-REALLOC/reallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldResourceId, newResourceId, incidentId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to reallocate resource via REST API', e);
    }
    return null;
  },

  simulateDelay: async (resourceId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/resources/${resourceId}/simulate-delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to simulate delay via REST API', e);
    }
    return null;
  },

  createAlert: async (alert: Partial<SystemAlert>): Promise<SystemAlert | null> => {
    try {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to create alert via REST API', e);
    }
    return null;
  },

  resolveAlert: async (id: string): Promise<SystemAlert | null> => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to resolve alert via REST API', e);
    }
    return null;
  },

  updateShelter: async (id: string, updates: Partial<Shelter>): Promise<Shelter | null> => {
    try {
      const res = await fetch(`${API_BASE}/shelters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeShelter(raw);
      }
    } catch (e) {
      console.error('Failed to update shelter via REST API', e);
    }
    return null;
  },

  sendBroadcast: async (broadcast: Partial<BroadcastMessage>): Promise<BroadcastMessage | null> => {
    try {
      const res = await fetch(`${API_BASE}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcast),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to send broadcast via REST API', e);
    }
    return null;
  },

  resetMockState: async (): Promise<{ incidents: Incident[]; resources: ResourceUnit[] } | null> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/reset-mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const rawIncidents = Array.isArray(json.incidents) ? json.incidents : [];
        const rawResources = Array.isArray(json.resources) ? json.resources : [];
        return {
          incidents: rawIncidents.map(normalizeIncident),
          resources: rawResources.map(normalizeResource),
        };
      }
    } catch (e) {
      console.error('Failed to reset mock state via REST API', e);
    }
    return null;
  },
};
