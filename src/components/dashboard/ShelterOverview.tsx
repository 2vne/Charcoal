import React from 'react';
import { Shelter } from '../../types';
import { Home, Users, AlertCircle } from 'lucide-react';

interface ShelterOverviewProps {
  shelters: Shelter[];
  onSelectShelter?: (id: string) => void;
}

export const ShelterOverview: React.FC<ShelterOverviewProps> = ({ shelters }) => {
  const totalCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const totalOccupancy = shelters.reduce((acc, s) => acc + s.currentOccupancy, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-blue-400" />
          <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
            Safe Shelters ({totalOccupancy} / {totalCapacity})
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-cyan-400">
          {Math.round((totalOccupancy / totalCapacity) * 100)}% OCCUPIED
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {shelters.map((s) => {
          const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
          return (
            <div key={s.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-100">
                <span>{s.name}</span>
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
                <span>Water: {s.supplies.waterDays}d reserve</span>
                <span>Med Staff: {s.medicalStaffCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
