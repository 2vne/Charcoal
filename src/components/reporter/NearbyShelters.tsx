import React from 'react';
import { Shelter } from '../../types';
import { calculateDistanceKm } from '../../utils/formatters';
import { MAP_DEFAULT_CENTER } from '../../utils/constants';
import { Navigation, Phone, Home, Shield } from 'lucide-react';

interface NearbySheltersProps {
  shelters: Shelter[];
}

export const NearbyShelters: React.FC<NearbySheltersProps> = ({ shelters }) => {
  // Sort shelters by proximity to default user location
  const sortedShelters = [...shelters]
    .filter((s) => s?.location?.lat && s?.location?.lng)
    .map((s) => ({
      ...s,
      distKm: calculateDistanceKm(
        MAP_DEFAULT_CENTER.lat,
        MAP_DEFAULT_CENTER.lng,
        s.location.lat,
        s.location.lng
      ),
    }))
    .sort((a, b) => a.distKm - b.distKm);

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Home className="w-5 h-5 text-blue-400" />
        <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
          Nearest Safe Shelters
        </h3>
      </div>

      <div className="space-y-3">
        {sortedShelters.map((s) => {
          const occ = s.occupied ?? (s as any).currentOccupancy ?? 0;
          const cap = s.capacity || 100;
          const occupancyPct = Math.min(100, Math.round((occ / cap) * 100));
          const isFull = occupancyPct >= 95;

          return (
            <div
              key={s.id}
              className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col gap-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-100">{s.name}</h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 font-semibold">
                      {s.distKm} km away
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.location?.address || 'Shelter Location'}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    isFull
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isFull ? 'FULL' : 'OPEN'}
                </span>
              </div>

              {/* Capacity Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    occupancyPct > 90 ? 'bg-red-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Capacity: {occ}/{cap}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${(s as any).contactPhone || '108'}`}
                    className="flex items-center gap-1 text-slate-300 hover:text-cyan-400"
                  >
                    <Phone className="w-3 h-3 text-cyan-400" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://maps.google.com/?q=${s.location.lat},${s.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:underline font-bold"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Route</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
