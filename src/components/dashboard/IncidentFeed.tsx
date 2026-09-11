import React, { useState, useMemo } from 'react';
import { Incident } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatTimeAgo } from '../../utils/formatters';
import { AlertTriangle, MapPin, Users, ChevronRight, TrendingUp } from 'lucide-react';

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

  // Filter first, then sort by zone score descending (highest threat first)
  const sortedIncidents = useMemo(() => {
    const filtered = incidents.filter((inc) => {
      if (filter === 'CRITICAL') return inc.severity === 'CRITICAL';
      if (filter === 'HIGH') return inc.severity === 'HIGH' || inc.severity === 'CRITICAL';
      return true;
    });

    return [...filtered].sort((a, b) => {
      const scoreA = a.zoneScore ?? a.aiPriorityScore ?? 0;
      const scoreB = b.zoneScore ?? b.aiPriorityScore ?? 0;
      return scoreB - scoreA;
    });
  }, [incidents, filter]);

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-red-400 border-red-500/60 bg-red-950/60';
    if (rank === 1) return 'text-orange-400 border-orange-500/60 bg-orange-950/60';
    if (rank === 2) return 'text-amber-400 border-amber-500/60 bg-amber-950/60';
    return 'text-slate-400 border-slate-600/60 bg-slate-900/60';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
          <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
            Live Incident Stream ({sortedIncidents.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-cyan-500" />
            RANKED BY ZONE SCORE
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
      </div>

      {/* Incident Stream — sorted by zone score */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sortedIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 font-mono text-xs text-center gap-2">
            <AlertTriangle className="w-8 h-8 text-slate-700" />
            <p>No active incidents</p>
          </div>
        )}
        {sortedIncidents.map((inc, index) => {
          const zoneScore = inc.zoneScore ?? inc.aiPriorityScore ?? 0;
          const rankColor = getRankColor(index);
          const isTopRisk = index === 0;

          return (
            <div
              key={inc.id}
              onClick={() => onSelectIncident?.(inc.id)}
              className={`group p-3 bg-slate-950/50 border rounded-lg transition-all cursor-pointer relative ${
                isTopRisk
                  ? 'border-red-500/40 shadow-sm shadow-red-900/30'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Rank Badge */}
              <div className="absolute -left-px top-2 bottom-2 w-0.5 rounded-full"
                style={{ background: isTopRisk ? '#ef4444' : index === 1 ? '#f97316' : index === 2 ? '#f59e0b' : '#334155' }}
              />

              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {/* Rank number */}
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-extrabold border ${rankColor}`}>
                    {index + 1}
                  </span>
                  <SeverityBadge severity={inc.severity} size="sm" />
                  <span className="font-mono text-[10px] text-slate-500">{inc.id}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span
                    className={`px-1.5 py-0.5 rounded border font-bold ${
                      zoneScore >= 60
                        ? 'bg-red-950/80 text-red-400 border-red-500/40'
                        : zoneScore >= 45
                        ? 'bg-orange-950/80 text-orange-400 border-orange-500/40'
                        : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                    }`}
                    title="zone_score = log10(people)*20 + disaster_type + urgency_keywords"
                  >
                    ⚡ {zoneScore}
                  </span>
                  <span className="text-slate-500">{formatTimeAgo(inc.reportedAt)}</span>
                </div>
              </div>

              <h4 className="font-semibold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors leading-tight">
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
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  inc.status === 'REPORTED'
                    ? 'text-amber-400 border-amber-500/30 bg-amber-950/40'
                    : inc.status === 'DISPATCHED'
                    ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40'
                    : inc.status === 'ON_SITE'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40'
                    : 'text-slate-400 border-slate-600'
                }`}>
                  {inc.status}
                </span>
                <div className="flex items-center gap-1">
                  {inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus =
                          inc.status === 'REPORTED' ? 'DISPATCHED'
                          : inc.status === 'DISPATCHED' ? 'ON_SITE'
                          : 'RESOLVED';
                        onUpdateStatus?.(inc.id, nextStatus);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                        inc.status === 'REPORTED'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/40'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-500/40'
                          : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/40'
                      }`}
                    >
                      {inc.status === 'REPORTED'
                        ? 'DISPATCH'
                        : inc.status === 'DISPATCHED'
                        ? 'MARK ON-SITE'
                        : 'RESOLVE'}
                    </button>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
