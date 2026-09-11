import { Incident, ResourceUnit, Shelter, BroadcastMessage, Allocation, SystemAlert, AuditEvent } from '../types';
import { INITIAL_MOCK_INCIDENTS } from '../data/mockIncidents';
import { INITIAL_MOCK_RESOURCES } from '../data/mockResources';
import { INITIAL_MOCK_SHELTERS } from '../data/mockShelters';
import { INITIAL_MOCK_BROADCASTS } from '../data/mockBroadcasts';
import { INITIAL_MOCK_ALLOCATIONS } from '../data/mockAllocations';
import { INITIAL_MOCK_ALERTS } from '../data/mockAlerts';
import { INITIAL_MOCK_AUDIT_EVENTS } from '../data/mockAuditEvents';

const STORAGE_KEYS = {
  INCIDENTS: 'ps20_incidents_v2',
  RESOURCES: 'ps20_resources_v2',
  SHELTERS: 'ps20_shelters_v2',
  BROADCASTS: 'ps20_broadcasts_v2',
  ALLOCATIONS: 'ps20_allocations_v2',
  ALERTS: 'ps20_alerts_v2',
  AUDIT_EVENTS: 'ps20_audit_events_v2',
};

export interface DisasterState {
  incidents: Incident[];
  resources: ResourceUnit[];
  shelters: Shelter[];
  allocations: Allocation[];
  alerts: SystemAlert[];
  broadcasts: BroadcastMessage[];
  auditEvents: AuditEvent[];
}

export const generateRandomMockIncidents = (): Incident[] => {
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
  const baseLat = 19.076;
  const baseLon = 72.8777;

  const count = 4 + Math.floor(Math.random() * 3);
  const shuffled = [...sampleIncidents].sort(() => 0.5 - Math.random()).slice(0, count);

  return shuffled.map((sample, i) => {
    const severity = i === 0 ? 'CRITICAL' : severities[Math.floor(Math.random() * severities.length)];
    const trapped = Math.floor(6 + Math.random() * 35);
    const injured = Math.floor(Math.random() * 12);
    const latOffset = (Math.random() - 0.5) * 0.08;
    const lonOffset = (Math.random() - 0.5) * 0.09;
    const id = `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      id,
      title: `${sample.title} - Sector ${Math.floor(1 + Math.random() * 12)}`,
      description: sample.description,
      category: sample.category,
      severity,
      status: 'REPORTED',
      location: {
        lat: parseFloat((baseLat + latOffset).toFixed(4)),
        lng: parseFloat((baseLon + lonOffset).toFixed(4)),
        address: `Sector ${Math.floor(1 + Math.random() * 12)} Disaster Zone`,
        zone: `Sector ${Math.floor(1 + Math.random() * 12)}`,
      },
      reportedAt: new Date(Date.now() - Math.floor(Math.random() * 20 * 60 * 1000)).toISOString(),
      reportedBy: 'Automated Mock Radar Simulator',
      strandedCount: trapped,
      injuredCount: injured,
      urgentNeeds: severity === 'CRITICAL' ? ['SEARCH_RESCUE', 'MEDICAL_UNIT'] : ['SEARCH_RESCUE'],
      dispatchedUnitIds: [],
    };
  });
};

export const mockDataService = {
  loadFullState: (): DisasterState => {
    try {
      const incidents = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      const resources = localStorage.getItem(STORAGE_KEYS.RESOURCES);
      const shelters = localStorage.getItem(STORAGE_KEYS.SHELTERS);
      const allocations = localStorage.getItem(STORAGE_KEYS.ALLOCATIONS);
      const alerts = localStorage.getItem(STORAGE_KEYS.ALERTS);
      const broadcasts = localStorage.getItem(STORAGE_KEYS.BROADCASTS);
      const auditEvents = localStorage.getItem(STORAGE_KEYS.AUDIT_EVENTS);

      if (incidents && resources && shelters && allocations && alerts && broadcasts && auditEvents) {
        return {
          incidents: JSON.parse(incidents),
          resources: JSON.parse(resources),
          shelters: JSON.parse(shelters),
          allocations: JSON.parse(allocations),
          alerts: JSON.parse(alerts),
          broadcasts: JSON.parse(broadcasts),
          auditEvents: JSON.parse(auditEvents),
        };
      }
    } catch (e) {
      console.error('Failed to load disaster state from localStorage, falling back to defaults', e);
    }

    // Default initialization
    const state: DisasterState = {
      incidents: INITIAL_MOCK_INCIDENTS,
      resources: INITIAL_MOCK_RESOURCES,
      shelters: INITIAL_MOCK_SHELTERS,
      allocations: INITIAL_MOCK_ALLOCATIONS,
      alerts: INITIAL_MOCK_ALERTS,
      broadcasts: INITIAL_MOCK_BROADCASTS,
      auditEvents: INITIAL_MOCK_AUDIT_EVENTS,
    };

    mockDataService.saveFullState(state);
    return state;
  },

  saveFullState: (state: DisasterState): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(state.incidents));
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(state.resources));
      localStorage.setItem(STORAGE_KEYS.SHELTERS, JSON.stringify(state.shelters));
      localStorage.setItem(STORAGE_KEYS.ALLOCATIONS, JSON.stringify(state.allocations));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(state.alerts));
      localStorage.setItem(STORAGE_KEYS.BROADCASTS, JSON.stringify(state.broadcasts));
      localStorage.setItem(STORAGE_KEYS.AUDIT_EVENTS, JSON.stringify(state.auditEvents));
    } catch (e) {
      console.error('Failed to save disaster state to localStorage', e);
    }
  },

  resetAllToDefault: (): DisasterState => {
    const randomIncidents = generateRandomMockIncidents();
    const resetResources = INITIAL_MOCK_RESOURCES.map((r) => ({
      ...r,
      status: 'AVAILABLE' as const,
      currentAssignment: undefined,
      destination: undefined,
      eta: undefined,
    }));

    const state: DisasterState = {
      incidents: randomIncidents,
      resources: resetResources,
      shelters: INITIAL_MOCK_SHELTERS,
      allocations: [],
      alerts: INITIAL_MOCK_ALERTS,
      broadcasts: INITIAL_MOCK_BROADCASTS,
      auditEvents: [
        {
          id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: new Date().toISOString(),
          actor: 'EOC Command Center',
          action: 'MOCK_STATE_RESET',
          details: `Wiped existing live incidents and randomly generated ${randomIncidents.length} new incidents in target sector.`,
          entityType: 'INCIDENT',
          entityId: 'SYSTEM',
        },
      ],
    };

    mockDataService.saveFullState(state);
    return state;
  },
};
