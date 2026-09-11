import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
import { mockDataService, DisasterState } from '../services/mockDataService';
import { apiService, getSocket, normalizeIncident, normalizeResource, normalizeShelter } from '../services/apiService';
import { convertEmergencyPlacesToResourceUnits } from '../utils/osmResourceGenerator';

interface DisasterContextType {
  incidents: Incident[];
  resources: ResourceUnit[];
  shelters: Shelter[];
  allocations: Allocation[];
  alerts: SystemAlert[];
  broadcasts: BroadcastMessage[];
  auditEvents: AuditEvent[];
  
  createIncident: (incident: Omit<Incident, 'id' | 'reportedAt'>) => Incident;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
  dispatchResource: (incidentId: string, resourceId: string, etaMinutes?: number, notes?: string) => void;
  reallocateResource: (oldResourceId: string, newResourceId: string, incidentId: string, etaMinutes?: number) => void;
  updateETA: (resourceId: string, etaMinutes: number) => void;
  updateShelter: (id: string, updates: Partial<Shelter> | ((prev: Shelter) => Shelter)) => void;
  createAlert: (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>) => SystemAlert;
  resolveAlert: (id: string) => void;
  createAuditEvent: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => AuditEvent;
  sendBroadcast: (broadcast: Omit<BroadcastMessage, 'id' | 'timestamp'>) => BroadcastMessage;
  getNearbyEmergencyPlaces: (lat: number, lon: number, radius?: number) => Promise<{ success: boolean; places: EmergencyPlace[]; error?: string }>;
  resetState: () => Promise<void> | void;
}

const DisasterContext = createContext<DisasterContextType | undefined>(undefined);

export const DisasterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DisasterState>(() => ({
    incidents: [],
    resources: [],
    shelters: [],
    allocations: [],
    alerts: [],
    broadcasts: [],
    auditEvents: [],
  }));

  // Fetch initial operational data from REST API on mount
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        const [incidents, resources, shelters, allocations, alerts, auditEvents, broadcasts] = await Promise.all([
          apiService.fetchIncidents(),
          apiService.fetchResources(),
          apiService.fetchShelters(),
          apiService.fetchAllocations(),
          apiService.fetchAlerts(),
          apiService.fetchAuditEvents(),
          apiService.fetchBroadcasts(),
        ]);

        setState({
          incidents,
          resources,
          shelters,
          allocations,
          alerts,
          auditEvents,
          broadcasts,
        });
      } catch (e) {
        console.warn('Backend REST sync error', e);
      }
    };
    syncFromBackend();
  }, []);

  // Socket.IO real-time listeners setup
  useEffect(() => {
    const socket = getSocket();

    const handleIncidentCreated = (rawInc: any) => {
      const inc = normalizeIncident(rawInc);
      setState((prev) => {
        if (prev.incidents.some((i) => i.id === inc.id)) return prev;
        return { ...prev, incidents: [inc, ...prev.incidents] };
      });
    };

    const handleIncidentUpdated = (rawInc: any) => {
      const inc = normalizeIncident(rawInc);
      setState((prev) => {
        if (inc.status === 'RESOLVED' || inc.status === 'CANCELLED') {
          return {
            ...prev,
            incidents: prev.incidents.filter((i) => i.id !== inc.id),
            resources: prev.resources.map((r) =>
              r.assignedIncidentId === inc.id
                ? { ...r, status: 'AVAILABLE', assignedIncidentId: undefined, etaMinutes: undefined }
                : r
            ),
          };
        }
        return {
          ...prev,
          incidents: prev.incidents.map((i) => (i.id === inc.id ? inc : i)),
        };
      });
    };

    const handleResourceDispatched = (payload: { resource: any; incident: any }) => {
      const resource = normalizeResource(payload.resource);
      const incident = normalizeIncident(payload.incident);
      setState((prev) => ({
        ...prev,
        resources: prev.resources.map((r) => (r.id === resource.id ? resource : r)),
        incidents: prev.incidents.map((i) => (i.id === incident.id ? incident : i)),
      }));
    };

    const handleResourceUpdated = (rawRes: any) => {
      const resource = normalizeResource(rawRes);
      setState((prev) => ({
        ...prev,
        resources: prev.resources.map((r) => (r.id === resource.id ? resource : r)),
      }));
    };

    const handleShelterUpdated = (rawShl: any) => {
      const shl = normalizeShelter(rawShl);
      setState((prev) => ({
        ...prev,
        shelters: prev.shelters.map((s) => (s.id === shl.id ? shl : s)),
      }));
    };

    const handleAlertCreated = (alt: SystemAlert) => {
      setState((prev) => {
        if (prev.alerts.some((a) => a.id === alt.id)) return prev;
        return { ...prev, alerts: [alt, ...prev.alerts] };
      });
    };

    const handleAuditCreated = (aud: AuditEvent) => {
      setState((prev) => {
        if (prev.auditEvents.some((a) => a.id === aud.id)) return prev;
        return { ...prev, auditEvents: [aud, ...prev.auditEvents] };
      });
    };

    const handleBroadcastCreated = (brd: BroadcastMessage) => {
      setState((prev) => {
        if (prev.broadcasts.some((b) => b.id === brd.id)) return prev;
        return { ...prev, broadcasts: [brd, ...prev.broadcasts] };
      });
    };

    const handleIncidentsReset = (rawIncidents: any[]) => {
      if (Array.isArray(rawIncidents)) {
        const normalized = rawIncidents.map(normalizeIncident);
        setState((prev) => ({
          ...prev,
          incidents: normalized,
          resources: prev.resources.map((r) => ({
            ...r,
            status: 'AVAILABLE' as const,
            currentAssignment: undefined,
            destination: undefined,
            eta: undefined,
          })),
          allocations: [],
        }));
      }
    };

    socket.on('incident.created', handleIncidentCreated);
    socket.on('incident.updated', handleIncidentUpdated);
    socket.on('incidents.reset', handleIncidentsReset);
    socket.on('resource.dispatched', handleResourceDispatched);
    socket.on('resource.updated', handleResourceUpdated);
    socket.on('shelter.updated', handleShelterUpdated);
    socket.on('alert.created', handleAlertCreated);
    socket.on('audit.created', handleAuditCreated);
    socket.on('broadcast.created', handleBroadcastCreated);

    return () => {
      socket.off('incident.created', handleIncidentCreated);
      socket.off('incident.updated', handleIncidentUpdated);
      socket.off('incidents.reset', handleIncidentsReset);
      socket.off('resource.dispatched', handleResourceDispatched);
      socket.off('resource.updated', handleResourceUpdated);
      socket.off('shelter.updated', handleShelterUpdated);
      socket.off('alert.created', handleAlertCreated);
      socket.off('audit.created', handleAuditCreated);
      socket.off('broadcast.created', handleBroadcastCreated);
    };
  }, []);

  // Auto-persist local state to localStorage as secondary cache
  useEffect(() => {
    mockDataService.saveFullState(state);
  }, [state]);

  // Helper for audit logs
  const logAudit = (
    currentState: DisasterState,
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    details: string,
    actor: string = 'Command Center'
  ): AuditEvent[] => {
    const newEvent: AuditEvent = {
      id: `AUD-${Math.floor(500 + Math.random() * 9500)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      entityType,
      entityId,
    };
    return [newEvent, ...currentState.auditEvents];
  };

  const createAuditEvent = (eventData: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent => {
    const newEvent: AuditEvent = {
      ...eventData,
      id: `AUD-${Math.floor(500 + Math.random() * 9500)}`,
      timestamp: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      auditEvents: [newEvent, ...prev.auditEvents],
    }));
    return newEvent;
  };

  const createIncident = (incidentData: Omit<Incident, 'id' | 'reportedAt'>): Incident => {
    const tempId = `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newIncident: Incident = {
      ...incidentData,
      id: tempId,
      reportedAt: new Date().toISOString(),
    };

    // Try REST API trigger
    apiService
      .createIncident({
        title: newIncident.title,
        description: newIncident.description,
        category: newIncident.category,
        severity: newIncident.severity,
        location: newIncident.location,
        strandedCount: newIncident.strandedCount,
        injuredCount: newIncident.injuredCount,
        reportedBy: newIncident.reportedBy,
      })
      .then((createdBackendInc) => {
        if (createdBackendInc) {
          setState((prev) => ({
            ...prev,
            incidents: prev.incidents.map((i) => (i.id === tempId ? createdBackendInc : i)),
          }));
        }
      });

    setState((prev) => {
      const updatedIncidents = [newIncident, ...prev.incidents];
      const updatedAudit = logAudit(
        prev,
        'INCIDENT_CREATED',
        'INCIDENT',
        newIncident.id,
        `Created incident: ${newIncident.title} (${newIncident.severity})`,
        newIncident.reportedBy || 'Reporter Portal'
      );
      return {
        ...prev,
        incidents: updatedIncidents,
        auditEvents: updatedAudit,
      };
    });

    return newIncident;
  };

  const updateIncident = (id: string, updates: Partial<Incident>) => {
    setState((prev) => {
      const updatedIncidents = prev.incidents.map((inc) =>
        inc.id === id ? { ...inc, ...updates } : inc
      );
      const updatedAudit = logAudit(
        prev,
        'INCIDENT_UPDATED',
        'INCIDENT',
        id,
        `Updated incident details for ${id}`
      );
      return {
        ...prev,
        incidents: updatedIncidents,
        auditEvents: updatedAudit,
      };
    });
  };

  const updateIncidentStatus = (id: string, status: IncidentStatus) => {
    apiService.updateIncidentStatus(id, status);
    setState((prev) => {
      const isRemoving = status === 'RESOLVED' || status === 'CANCELLED';
      const updatedIncidents = isRemoving
        ? prev.incidents.filter((inc) => inc.id !== id)
        : prev.incidents.map((inc) => (inc.id === id ? { ...inc, status } : inc));

      const updatedResources = isRemoving
        ? prev.resources.map((r) =>
            r.assignedIncidentId === id
              ? { ...r, status: 'AVAILABLE' as const, assignedIncidentId: undefined, etaMinutes: undefined }
              : r
          )
        : prev.resources;

      const updatedAudit = logAudit(
        prev,
        'INCIDENT_STATUS_CHANGED',
        'INCIDENT',
        id,
        `Changed incident ${id} status to ${status}${isRemoving ? ' (Resolved & Removed from live map)' : ''}`
      );
      return {
        ...prev,
        incidents: updatedIncidents,
        resources: updatedResources,
        auditEvents: updatedAudit,
      };
    });
  };

  const dispatchResource = (
    incidentId: string,
    resourceId: string,
    etaMinutes: number = 15,
    notes?: string
  ) => {
    apiService.dispatchResource(incidentId, resourceId);

    setState((prev) => {
      const updatedResources = prev.resources.map((res) =>
        res.id === resourceId
          ? {
              ...res,
              status: 'EN_ROUTE' as const,
              assignedIncidentId: incidentId,
              etaMinutes,
            }
          : res
      );

      const updatedIncidents = prev.incidents.map((inc) => {
        if (inc.id === incidentId) {
          const currentUnits = inc.dispatchedUnitIds || [];
          const dispatchedUnitIds = currentUnits.includes(resourceId)
            ? currentUnits
            : [...currentUnits, resourceId];
          return {
            ...inc,
            dispatchedUnitIds,
            status: inc.status === 'REPORTED' ? ('DISPATCHED' as const) : inc.status,
            etaMinutes: Math.min(inc.etaMinutes ?? 999, etaMinutes),
          };
        }
        return inc;
      });

      const newAllocation: Allocation = {
        id: `ALC-${Math.floor(300 + Math.random() * 9700)}`,
        incidentId,
        resourceId,
        dispatchedAt: new Date().toISOString(),
        etaMinutes,
        status: 'ACTIVE',
        notes: notes || `Dispatched to incident ${incidentId}`,
      };
      const updatedAllocations = [newAllocation, ...prev.allocations];

      const updatedAudit = logAudit(
        prev,
        'RESOURCE_DISPATCHED',
        'ALLOCATION',
        newAllocation.id,
        `Dispatched unit ${resourceId} to incident ${incidentId} (ETA: ${etaMinutes}m)`
      );

      return {
        ...prev,
        resources: updatedResources,
        incidents: updatedIncidents,
        allocations: updatedAllocations,
        auditEvents: updatedAudit,
      };
    });
  };

  const reallocateResource = (
    oldResourceId: string,
    newResourceId: string,
    incidentId: string,
    etaMinutes: number = 15
  ) => {
    apiService.reallocateResource(oldResourceId, newResourceId, incidentId);

    setState((prev) => {
      const updatedResources = prev.resources.map((res) => {
        if (res.id === oldResourceId) {
          return {
            ...res,
            status: 'AVAILABLE' as const,
            assignedIncidentId: undefined,
            etaMinutes: undefined,
          };
        }
        if (res.id === newResourceId) {
          return {
            ...res,
            status: 'EN_ROUTE' as const,
            assignedIncidentId: incidentId,
            etaMinutes,
          };
        }
        return res;
      });

      const updatedAllocations = prev.allocations.map((alc) =>
        alc.resourceId === oldResourceId && alc.incidentId === incidentId && alc.status === 'ACTIVE'
          ? { ...alc, status: 'REALLOCATED' as const }
          : alc
      );

      const newAllocation: Allocation = {
        id: `ALC-${Math.floor(300 + Math.random() * 9700)}`,
        incidentId,
        resourceId: newResourceId,
        dispatchedAt: new Date().toISOString(),
        etaMinutes,
        status: 'ACTIVE',
        notes: `Reallocated replacement for unit ${oldResourceId}`,
      };

      const updatedIncidents = prev.incidents.map((inc) => {
        if (inc.id === incidentId) {
          const currentUnits = (inc.dispatchedUnitIds || []).filter((u) => u !== oldResourceId);
          return {
            ...inc,
            dispatchedUnitIds: [...currentUnits, newResourceId],
            etaMinutes,
          };
        }
        return inc;
      });

      const updatedAudit = logAudit(
        prev,
        'RESOURCE_REALLOCATED',
        'ALLOCATION',
        newAllocation.id,
        `Reallocated unit from ${oldResourceId} to ${newResourceId} for incident ${incidentId}`
      );

      return {
        ...prev,
        resources: updatedResources,
        allocations: [newAllocation, ...updatedAllocations],
        incidents: updatedIncidents,
        auditEvents: updatedAudit,
      };
    });
  };

  const updateETA = (resourceId: string, etaMinutes: number) => {
    setState((prev) => {
      const targetResource = prev.resources.find((r) => r.id === resourceId);
      if (!targetResource) return prev;

      const updatedResources = prev.resources.map((r) =>
        r.id === resourceId ? { ...r, etaMinutes } : r
      );

      let updatedIncidents = prev.incidents;
      if (targetResource.assignedIncidentId) {
        updatedIncidents = prev.incidents.map((inc) =>
          inc.id === targetResource.assignedIncidentId ? { ...inc, etaMinutes } : inc
        );
      }

      const updatedAllocations = prev.allocations.map((alc) =>
        alc.resourceId === resourceId && alc.status === 'ACTIVE'
          ? { ...alc, etaMinutes }
          : alc
      );

      const updatedAudit = logAudit(
        prev,
        'ETA_UPDATED',
        'RESOURCE',
        resourceId,
        `Updated ETA for unit ${resourceId} to ${etaMinutes} minutes`
      );

      return {
        ...prev,
        resources: updatedResources,
        incidents: updatedIncidents,
        allocations: updatedAllocations,
        auditEvents: updatedAudit,
      };
    });
  };

  const updateShelter = (
    id: string,
    updates: Partial<Shelter> | ((prev: Shelter) => Shelter)
  ) => {
    setState((prev) => {
      const updatedShelters = prev.shelters.map((s) => {
        if (s.id === id) {
          const next = typeof updates === 'function' ? updates(s) : { ...s, ...updates };
          apiService.updateShelter(id, next);
          return next;
        }
        return s;
      });

      const updatedAudit = logAudit(
        prev,
        'SHELTER_UPDATED',
        'SHELTER',
        id,
        `Updated occupancy / capacity details for shelter ${id}`
      );

      return {
        ...prev,
        shelters: updatedShelters,
        auditEvents: updatedAudit,
      };
    });
  };

  const createAlert = (
    alertData: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>
  ): SystemAlert => {
    const newAlert: SystemAlert = {
      ...alertData,
      id: `ALT-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    setState((prev) => {
      const updatedAlerts = [newAlert, ...prev.alerts];
      const updatedAudit = logAudit(
        prev,
        'ALERT_CREATED',
        'ALERT',
        newAlert.id,
        `System Alert Triggered: ${newAlert.title}`
      );
      return {
        ...prev,
        alerts: updatedAlerts,
        auditEvents: updatedAudit,
      };
    });

    return newAlert;
  };

  const resolveAlert = (id: string) => {
    setState((prev) => {
      const updatedAlerts = prev.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a));
      const updatedAudit = logAudit(
        prev,
        'ALERT_RESOLVED',
        'ALERT',
        id,
        `System Alert ${id} marked resolved`
      );
      return {
        ...prev,
        alerts: updatedAlerts,
        auditEvents: updatedAudit,
      };
    });
  };

  const sendBroadcast = (
    broadcastData: Omit<BroadcastMessage, 'id' | 'timestamp'>
  ): BroadcastMessage => {
    const newBroadcast: BroadcastMessage = {
      ...broadcastData,
      id: `BRD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
    };

    apiService.sendBroadcast(newBroadcast);

    setState((prev) => {
      const updatedBroadcasts = [newBroadcast, ...prev.broadcasts];
      const updatedAudit = logAudit(
        prev,
        'BROADCAST_SENT',
        'BROADCAST',
        newBroadcast.id,
        `Transmitted Broadcast Alert: ${newBroadcast.title}`
      );
      return {
        ...prev,
        broadcasts: updatedBroadcasts,
        auditEvents: updatedAudit,
      };
    });

    return newBroadcast;
  };

  const resetState = async () => {
    const res = await apiService.resetMockState();
    if (res && Array.isArray(res.incidents) && res.incidents.length > 0) {
      setState((prev) => ({
        ...prev,
        incidents: res.incidents,
        resources: res.resources.length > 0
          ? res.resources
          : prev.resources.map((r) => ({
              ...r,
              status: 'AVAILABLE' as const,
              currentAssignment: undefined,
              destination: undefined,
              eta: undefined,
            })),
        allocations: [],
      }));
    } else {
      const defaultState = mockDataService.resetAllToDefault();
      setState(defaultState);
    }
  };

  const registerDynamicNearbyResources = (places: EmergencyPlace[]) => {
    if (!places || places.length === 0) return;
    const newUnits = convertEmergencyPlacesToResourceUnits(places);
    setState((prev) => {
      const existingIds = new Set(prev.resources.map((r) => r.id));
      const toAdd = newUnits.filter((u) => !existingIds.has(u.id));
      if (toAdd.length === 0) return prev;
      return {
        ...prev,
        resources: [...prev.resources, ...toAdd],
      };
    });
  };

  const getNearbyEmergencyPlaces = async (lat: number, lon: number, radius?: number) => {
    const result = await apiService.fetchNearbyEmergencyPlaces(lat, lon, radius);
    if (result.success && Array.isArray(result.places) && result.places.length > 0) {
      registerDynamicNearbyResources(result.places);
    }
    return result;
  };

  return (
    <DisasterContext.Provider
      value={{
        incidents: state.incidents,
        resources: state.resources,
        shelters: state.shelters,
        allocations: state.allocations,
        alerts: state.alerts,
        broadcasts: state.broadcasts,
        auditEvents: state.auditEvents,

        createIncident,
        updateIncident,
        updateIncidentStatus,
        dispatchResource,
        reallocateResource,
        updateETA,
        updateShelter,
        createAlert,
        resolveAlert,
        createAuditEvent,
        sendBroadcast,
        getNearbyEmergencyPlaces,
        resetState,
      }}
    >
      {children}
    </DisasterContext.Provider>
  );
};

export const useDisasterContext = () => {
  const context = useContext(DisasterContext);
  if (!context) {
    throw new Error('useDisasterContext must be used within a DisasterProvider');
  }
  return context;
};
