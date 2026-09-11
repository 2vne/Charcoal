import React, { useMemo } from 'react';
import { ResourceUnit, Incident } from '../../types';
import { RESOURCE_CATEGORY_LABELS } from '../../utils/constants';
import { calculateHaversineDistance } from '../../utils/aiRecommendationEngine';
import { Truck, BatteryCharging, MapPin, Radio } from 'lucide-react';

interface ResourceSummaryProps {
  resources: ResourceUnit[];
  selectedIncident?: Incident;
  radiusMeters?: number;
  onUpdateStatus?: (id: string, status: ResourceUnit['status']) => void;
}

export const ResourceSummary: React.FC<ResourceSummaryProps> = ({
  resources,
  selectedIncident,
  radiusMeters = 5000,
}) => {
  const radiusKm = radiusMeters / 1000;

  // Filter resources strictly located within incident radius
  const filteredResources = useMemo(() => {
    if (!selectedIncident?.location?.lat) return resources.map((r) => ({ resource: r, distanceKm: 0 }));
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;

    return resources
      .map((r) => {
        const resLat = r.currentLocation?.lat ?? 0;
        const resLng = r.currentLocation?.lng ?? 0;
        const distanceKm = calculateHaversineDistance(resLat, resLng, incLat, incLng);
        return { resource: r, distanceKm };
      })
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [resources, selectedIncident, radiusKm]);

  const activeUnits = filteredResources.filter(
    (item) => item.resource.status === 'ON_SITE' || item.resource.status === 'EN_ROUTE'
  ).length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
            In-Radius Readiness ({activeUnits}/{filteredResources.length} Deployed)
          </h3>
        </div>
        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 animate-pulse" />
          {radiusKm} KM RADIUS
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {filteredResources.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 text-slate-500 font-mono text-xs text-center p-2">
            <p>No mobile units deployed inside the {radiusKm}km radius</p>
          </div>
        )}
        {filteredResources.map(({ resource: res, distanceKm }) => (
          <div
            key={res.id}
            className="p-2 bg-slate-950/60 border border-slate-800 rounded flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-100">{res.callsign}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {RESOURCE_CATEGORY_LABELS[res.category] || res.category}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-slate-400">
                <span className="truncate max-w-[120px]">{res.currentLocation?.address || 'Base Location'}</span>
                {distanceKm > 0 && (
                  <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {distanceKm} km
                  </span>
                )}
              </div>
            </div>
            <div className="text-right font-mono">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  res.status === 'AVAILABLE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : res.status === 'EN_ROUTE'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {res.status}
              </span>
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                <BatteryCharging className="w-3 h-3 text-cyan-400" />
                <span>{res.fuelOrSupplyPct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
