import React from 'react';
import { Shelter } from '../../types';

interface ShelterMarkerProps {
  shelter: Shelter;
  onClick?: () => void;
}

export const ShelterMarker: React.FC<ShelterMarkerProps> = ({ shelter, onClick }) => {
  const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);

  return (
    <div 
      onClick={onClick}
      className="p-3 bg-slate-900/90 border border-slate-700 rounded-lg hover:border-blue-500 cursor-pointer transition-all"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          SHELTER
        </span>
        <span className="font-mono text-[10px] text-slate-400">{shelter.id}</span>
      </div>
      <h5 className="font-semibold text-xs text-slate-100">{shelter.name}</h5>
      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div 
          className={`h-1.5 rounded-full ${occupancyPct > 90 ? 'bg-red-500' : occupancyPct > 75 ? 'bg-orange-500' : 'bg-cyan-500'}`}
          style={{ width: `${occupancyPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
        <span>Capacity: {shelter.currentOccupancy}/{shelter.capacity}</span>
        <span className="font-bold text-slate-200">{occupancyPct}%</span>
      </div>
    </div>
  );
};
