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
    const defaultState: DisasterState = {
      incidents: INITIAL_MOCK_INCIDENTS,
      resources: INITIAL_MOCK_RESOURCES,
      shelters: INITIAL_MOCK_SHELTERS,
      allocations: INITIAL_MOCK_ALLOCATIONS,
      alerts: INITIAL_MOCK_ALERTS,
      broadcasts: INITIAL_MOCK_BROADCASTS,
      auditEvents: INITIAL_MOCK_AUDIT_EVENTS,
    };
    mockDataService.saveFullState(defaultState);
    return defaultState;
  }
};
