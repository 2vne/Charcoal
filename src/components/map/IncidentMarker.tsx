import React from 'react';
import { Incident } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';

interface IncidentMarkerProps {
  incident: Incident;
  onClick?: () => void;
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({ incident, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="p-3 bg-slate-900/90 border border-slate-700 rounded-lg hover:border-cyan-500 cursor-pointer transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <SeverityBadge severity={incident.severity} size="sm" />
        <span className="font-mono text-[10px] text-slate-400">{incident.id}</span>
      </div>
      <h5 className="font-semibold text-xs text-slate-100 line-clamp-1">{incident.title}</h5>
      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{incident.location?.address || 'Disaster Location'}</p>
    </div>
  );
};
