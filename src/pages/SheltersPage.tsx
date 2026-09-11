import React from 'react';
import { useShelters } from '../hooks/useShelters';
import { Home, Users, Plus, Minus, Phone, ShieldCheck } from 'lucide-react';

export const SheltersPage: React.FC = () => {
  const { shelters, updateOccupancy } = useShelters();

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4 font-mono">
      <div className="border-b border-slate-800 pb-3">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-400" />
          SAFE SHELTER NETWORK & OCCUPANCY MONITOR
        </h1>
        <p className="text-xs text-slate-400">
          Capacity planning, food/water stockpile reserves, and evacuation receiving stats.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shelters.map((shelter) => {
          const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);

          return (
            <div
              key={shelter.id}
              className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                      {shelter.id}
                    </span>
                    <span className="text-xs text-slate-400">{shelter.location?.zone || 'Safe Zone'}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-1">{shelter.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{shelter.location?.address || 'Shelter Facility'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-cyan-400">{occupancyPct}%</span>
                  <div className="text-[10px] text-slate-500">Occupancy</div>
                </div>
              </div>

              {/* Occupancy Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Occupancy Counter:</span>
                  <span className="font-bold">
                    {shelter.currentOccupancy} / {shelter.capacity} evacuees
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      occupancyPct > 90 ? 'bg-red-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>

              {/* Supplies Matrix */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded border border-slate-800/80 text-center text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">WATER SUPPLY</div>
                  <div className="font-bold text-cyan-400">{shelter.supplies.waterDays} Days</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">FOOD RATIONS</div>
                  <div className="font-bold text-emerald-400">{shelter.supplies.foodDays} Days</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">MED KITS</div>
                  <div className="font-bold text-amber-400">{shelter.supplies.medicalKits} Kits</div>
                </div>
              </div>

              {/* Occupancy Adjustment Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  {shelter.contactPhone}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateOccupancy(shelter.id, -10)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs px-2 font-bold text-slate-200">Admit Evacuees</span>
                  <button
                    onClick={() => updateOccupancy(shelter.id, 10)}
                    className="p-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded border border-cyan-500/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
