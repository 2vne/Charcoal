import React, { useState } from 'react';
import { Incident } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatTimeAgo } from '../../utils/formatters';
import { AlertTriangle, MapPin, Users, Activity, ChevronRight } from 'lucide-react';

interface IncidentFeedProps {
  incidents: Incident[];
  onSelectIncident?: (id: string) => void;
  onUpdateStatus?: (id: string, status: Incident['status']) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  onSelectIncident,
  onUpdateStatus,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'CRITICAL') return inc.severity === 'CRITICAL';
    if (filter === 'HIGH') return inc.severity === 'HIGH' || inc.severity === 'CRITICAL';
    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
          <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
            Live Incident Stream ({filteredIncidents.length})
          </h3>
        </div>
        <div className="flex gap-1 font-mono text-[10px]">
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded border transition-all ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold'
                  : 'bg-slate-800/50 text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Stream */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            onClick={() => onSelectIncident?.(inc.id)}
            className="group p-3 bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 rounded-lg transition-all cursor-pointer relative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <SeverityBadge severity={inc.severity} size="sm" />
                <span className="font-mono text-[10px] text-slate-500">{inc.id}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 font-bold" title="zone_score = log10(people)*20 + disaster_type + keywords">
                  ZONE {inc.zoneScore ?? inc.aiPriorityScore ?? 50}
                </span>
                <span className="text-slate-400">{formatTimeAgo(inc.reportedAt)}</span>
              </div>
            </div>

            <h4 className="font-semibold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors">
              {inc.title}
            </h4>

            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[130px]">{inc.location?.address || 'Disaster Area'}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Users className="w-3 h-3 shrink-0" />
                <span>Stranded: {inc.strandedCount ?? 0}</span>
              </span>
            </div>

            {/* Quick Action Bar */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                Status: <strong className="text-slate-200">{inc.status}</strong>
              </span>
              <div className="flex items-center gap-1">
                {inc.status === 'REPORTED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus?.(inc.id, 'DISPATCHED');
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40"
                  >
                    DISPATCH UNIT
                  </button>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
