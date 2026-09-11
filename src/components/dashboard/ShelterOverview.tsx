import React, { useMemo } from 'react';
import { Shelter, Incident } from '../../types';
import { calculateHaversineDistance } from '../../utils/aiRecommendationEngine';
import { Home, MapPin, Radio } from 'lucide-react';

interface ShelterOverviewProps {
  shelters: Shelter[];
  selectedIncident?: Incident;
  radiusMeters?: number;
  onSelectShelter?: (id: string) => void;
}

export const ShelterOverview: React.FC<ShelterOverviewProps> = ({
  shelters,
  selectedIncident,
  radiusMeters = 5000,
}) => {
  const radiusKm = radiusMeters / 1000;

  const filteredShelters = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) {
      return shelters.map((s) => ({ shelter: s, distanceKm: 0 }));
    }
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;

    return shelters
      .map((s) => {
        const sLat = s.location?.lat ?? 0;
        const sLng = s.location?.lng ?? 0;
        const distanceKm = calculateHaversineDistance(sLat, sLng, incLat, incLng);
        return { shelter: s, distanceKm };
      })
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [shelters, selectedIncident, radiusKm]);

  const totalCapacity = filteredShelters.reduce((acc, item) => acc + item.shelter.capacity, 0);
  const totalOccupancy = filteredShelters.reduce((acc, item) => acc + item.shelter.currentOccupancy, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-blue-400" />
          <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
            In-Radius Shelters ({filteredShelters.length}/{shelters.length})
          </h3>
        </div>
        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 animate-pulse" />
          {radiusKm} KM RADIUS
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {filteredShelters.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 text-slate-500 font-mono text-xs text-center p-2">
            <p>No safe shelters located inside {radiusKm}km radius</p>
          </div>
        )}
        {filteredShelters.map(({ shelter: s, distanceKm }) => {
          const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
          return (
            <div key={s.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-100">
                <div className="flex items-center gap-1.5">
                  <span>{s.name}</span>
                  {distanceKm > 0 && (
                    <span className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {distanceKm}km
                    </span>
                  )}
                </div>
                <span className="font-mono text-slate-400">{s.currentOccupancy}/{s.capacity}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-orange-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>Water: {s.supplies?.waterDays ?? 3}d reserve</span>
                <span>Med Staff: {s.medicalStaffCount ?? 2}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
