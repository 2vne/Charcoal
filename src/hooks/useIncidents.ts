import { useDisasterContext } from '../context/DisasterContext';

export function useIncidents() {
  const { incidents, createIncident, updateIncidentStatus, updateIncident } = useDisasterContext();

  return {
    incidents,
    loading: false,
    addIncident: createIncident,
    updateIncidentStatus,
    updateIncident,
  };
}
