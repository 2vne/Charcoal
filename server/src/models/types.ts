export interface IIncident {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'REPORTED' | 'DISPATCHED' | 'ON_SITE' | 'RESOLVED' | 'CANCELLED';
  latitude: number;
  longitude: number;
  reportedAt: string;
  peopleAffected: number;
  peopleTrapped: number;
  injured: number;
  requiredResources: string[];
  assignedResources: string[];
  source: string;
  photoUrl?: string;
  aiAssessment?: {
    priorityScore: number;
    recommendedResourceTypes: string[];
    urgencyReasoning: string;
    assessedAt: string;
  };
  eta?: number;
}

export interface IResource {
  id: string;
  name: string;
  type: 'MEDICAL_UNIT' | 'SEARCH_RESCUE' | 'SUPPLY_CONVOY' | 'HEAVY_EQUIPMENT' | 'WATER_VESSEL' | 'HELICOPTER';
  agency: string;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'EN_ROUTE' | 'ON_SITE' | 'MAINTENANCE';
  capacity: number;
  currentAssignment?: string;
  assignedIncidentId?: string;
  destination?: string;
  eta?: number;
  fuelOrSupplyPct?: number;
  contactChannel?: string;
}

export interface IShelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupied: number;
  availableBeds: number;
  foodSupply: number; // in days
  waterSupply: number; // in days
  medicalStaff: number;
  status: 'OPEN' | 'FULL' | 'CLOSED';
  address?: string;
  contactPhone?: string;
}

export interface IAllocation {
  id: string;
  resourceId: string;
  incidentId: string;
  needType: string;
  priorityScore: number;
  distance: number;
  eta: number;
  status: 'ACTIVE' | 'REALLOCATED' | 'COMPLETED' | 'CANCELLED';
  reason: string;
  allocatedAt: string;
}

export interface IAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  incidentId?: string;
  resourceId?: string;
  description: string;
}

export interface IAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  incidentId?: string;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
}

export interface IBroadcast {
  id: string;
  timestamp: string;
  priority: 'EMERGENCY' | 'ADVISORY' | 'UPDATE';
  title: string;
  message: string;
  targetArea: string;
  issuedBy: string;
}
