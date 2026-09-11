import React, { useState, useMemo } from 'react';
import { Incident, ResourceUnit } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatTimeAgo } from '../../utils/formatters';
import { AlertTriangle, MapPin, Users, ChevronRight, TrendingUp, Zap } from 'lucide-react';

interface IncidentFeedProps {
  incidents: Incident[];
  resources?: ResourceUnit[];
  onSelectIncident?: (id: string) => void;
  onUpdateStatus?: (id: string, status: Incident['status']) => void;
  onDispatchResource?: (incidentId: string, resourceId: string, etaMinutes?: number) => void;
}

/**
 * Picks the best available resource for a given incident.
 * Prefers resources matching required types; falls back to any AVAILABLE unit.
 */
function pickBestResource(resources: ResourceUnit[], incident: Incident): ResourceUnit | null {
  const available = resources.filter((r) => r.status === 'AVAILABLE');
  if (!available.length) return null;

  const needed = incident.urgentNeeds ?? [];

  // Try to match by category
  const matched = available.find((r) =>
    needed.some((n) => r.category?.toUpperCase().includes(n.replace(/_/g, '')) || n.includes(r.category?.toUpperCase() ?? ''))
  );
  return matched ?? available[0];
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  resources = [],
  onSelectIncident,
  onUpdateStatus,
  onDispatchResource,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');

  // Filter then sort by zone score descending
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

  const getRankStyle = (rank: number) => {
    if (rank === 0) return { badge: 'text-red-400 border-red-500/60 bg-red-950/60', bar: '#ef4444' };
    if (rank === 1) return { badge: 'text-orange-400 border-orange-500/60 bg-orange-950/60', bar: '#f97316' };
    if (rank === 2) return { badge: 'text-amber-400 border-amber-500/60 bg-amber-950/60', bar: '#f59e0b' };
    return { badge: 'text-slate-400 border-slate-600/60 bg-slate-900/60', bar: '#334155' };
  };

  const handleDispatch = (e: React.MouseEvent, inc: Incident) => {
    e.stopPropagation();

    if (inc.status === 'REPORTED') {
      // Auto-pick best resource and call dispatchResource directly
      const best = pickBestResource(resources, inc);
      if (best && onDispatchResource) {
        onDispatchResource(inc.id, best.id, 15);
      } else {
        // No resources available — just flip status
        onUpdateStatus?.(inc.id, 'DISPATCHED');
      }
    } else if (inc.status === 'DISPATCHED') {
      onUpdateStatus?.(inc.id, 'ON_SITE');
    } else if (inc.status === 'ON_SITE') {
      onUpdateStatus?.(inc.id, 'RESOLVED');
    }
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

      {/* Incident Stream */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sortedIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 font-mono text-xs text-center gap-2">
            <AlertTriangle className="w-8 h-8 text-slate-700" />
            <p>No active incidents</p>
          </div>
        )}
        {sortedIncidents.map((inc, index) => {
          const zoneScore = inc.zoneScore ?? inc.aiPriorityScore ?? 0;
          const { badge: rankBadge, bar: rankBar } = getRankStyle(index);
          const isTopRisk = index === 0;
          const bestResource = inc.status === 'REPORTED' ? pickBestResource(resources, inc) : null;

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
              {/* Left rank bar */}
              <div
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                style={{ background: rankBar }}
              />

              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-extrabold border ${rankBadge}`}>
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
                    title="zone_score = log10(people)×20 + disaster_type + urgency_keywords"
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
                      onClick={(e) => handleDispatch(e, inc)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all flex items-center gap-1 ${
                        inc.status === 'REPORTED'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/40'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-500/40'
                          : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/40'
                      }`}
                    >
                      {inc.status === 'REPORTED' && <Zap className="w-2.5 h-2.5" />}
                      {inc.status === 'REPORTED'
                        ? bestResource
                          ? `DISPATCH ${bestResource.callsign ?? bestResource.category}`
                          : 'DISPATCH'
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
