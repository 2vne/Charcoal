import { useDisasterContext } from '../context/DisasterContext';
import { ResourceUnit } from '../types';

export function useResources() {
  const { resources, dispatchResource, updateETA, reallocateResource } = useDisasterContext();

  const updateResourceStatus = (id: string, status: ResourceUnit['status'], assignedIncidentId?: string) => {
    if (assignedIncidentId) {
      dispatchResource(assignedIncidentId, id);
    }
  };

  return {
    resources,
    loading: false,
    updateResourceStatus,
    dispatchResource,
    reallocateResource,
    updateETA,
  };
}
