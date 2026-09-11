export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentCategory = 
  | 'FLOOD'
  | 'EARTHQUAKE'
  | 'WILDFIRE'
  | 'POWER_OUTAGE'
  | 'MEDICAL_EMERGENCY'
  | 'STRUCTURAL_COLLAPSE'
  | 'HAZMAT'
  | 'LANDSLIDE';

export type IncidentStatus = 'REPORTED' | 'DISPATCHED' | 'ON_SITE' | 'RESOLVED' | 'CANCELLED';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address: string;
  zone: string;
}

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  severity: SeverityLevel;
  status: IncidentStatus;
  location: LocationCoordinates;
  reportedAt: string;
  reportedBy: string;
  strandedCount: number;
  injuredCount: number;
  urgentNeeds: string[];
  description: string;
  dispatchedUnitIds?: string[];
  aiPriorityScore?: number;
  zoneScore?: number;
  peopleAffectedScore?: number;
  disasterTypeScore?: number;
  urgencyKeywordScore?: number;
  detectedKeywords?: string[];
  urgencyReasoning?: string;
  etaMinutes?: number;
  aiAssessment?: {
    priorityScore: number;
    zoneScore?: number;
    peopleAffectedScore?: number;
    disasterTypeScore?: number;
    urgencyKeywordScore?: number;
    detectedKeywords?: string[];
    recommendedResourceTypes: string[];
    urgencyReasoning: string;
    assessedAt: string;
    agentModel?: string;
  };
}

export type ResourceCategory = 'MEDICAL_UNIT' | 'SEARCH_RESCUE' | 'SUPPLY_CONVOY' | 'HEAVY_EQUIPMENT' | 'WATER_VESSEL' | 'HELICOPTER';

export type ResourceStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_SITE' | 'MAINTENANCE';

export interface ResourceUnit {
  id: string;
  callsign: string;
  category: ResourceCategory;
  status: ResourceStatus;
  personnelCount: number;
  currentLocation: LocationCoordinates;
  assignedIncidentId?: string;
  fuelOrSupplyPct: number;
  contactChannel: string;
  etaMinutes?: number;
}

export interface Shelter {
  id: string;
  name: string;
  location: LocationCoordinates;
  capacity: number;
  currentOccupancy: number;
  occupied?: number;
  medicalStaffCount: number;
  supplies: {
    waterDays: number;
    foodDays: number;
    medicalKits: number;
  };
  contactPhone: string;
  isOpen: boolean;
  status?: string;
}

export interface BroadcastMessage {
  id: string;
  timestamp: string;
  priority: 'EMERGENCY' | 'ADVISORY' | 'UPDATE';
  title: string;
  message: string;
  targetArea: string;
  issuedBy: string;
}

export interface Allocation {
  id: string;
  incidentId: string;
  resourceId: string;
  dispatchedAt: string;
  allocatedAt?: string;
  etaMinutes?: number;
  status: 'ACTIVE' | 'REALLOCATED' | 'COMPLETED' | 'CANCELLED' | string;
  notes?: string;
  routePolyline?: any;
  geometry?: any;
}

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: SeverityLevel;
  timestamp: string;
  resolved: boolean;
  relatedIncidentId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  entityType: 'INCIDENT' | 'RESOURCE' | 'SHELTER' | 'ALLOCATION' | 'ALERT' | 'BROADCAST';
  entityId: string;
}

export type EmergencyPlaceType = 'hospital' | 'fire_station' | 'police_station' | 'ngo' | 'rescue';

export interface EmergencyPlace {
  id: string;
  name: string;
  type: EmergencyPlaceType;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  distanceKm: number;
  source: 'OPENSTREETMAP';
}
