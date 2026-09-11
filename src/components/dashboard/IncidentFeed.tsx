import React, { useState, useMemo } from 'react';
import { Incident, ResourceUnit } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatTimeAgo } from '../../utils/formatters';
import {
  getRankedResourceRecommendations,
  ResourceRecommendation,
} from '../../utils/aiRecommendationEngine';
import {
  AlertTriangle,
  MapPin,
  Users,
  ChevronRight,
  TrendingUp,
  Zap,
  Bot,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface IncidentFeedProps {
  incidents: Incident[];
  resources?: ResourceUnit[];
  selectedIncidentId?: string;
  onSelectIncident?: (id: string) => void;
  onSelectResourceForRoute?: (incidentId: string, resourceId: string) => void;
  onUpdateStatus?: (id: string, status: Incident['status']) => void;
  onDispatchResource?: (incidentId: string, resourceId: string, etaMinutes?: number) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  resources = [],
  selectedIncidentId,
  onSelectIncident,
  onSelectResourceForRoute,
  onUpdateStatus,
  onDispatchResource,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  // Tracks custom dropdown selections per incident: { [incidentId]: resourceId }
  const [customSelectedUnits, setCustomSelectedUnits] = useState<Record<string, string>>({});

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

  const handleUnitSelect = (incidentId: string, resourceId: string) => {
    setCustomSelectedUnits((prev) => ({ ...prev, [incidentId]: resourceId }));
    onSelectResourceForRoute?.(incidentId, resourceId);
  };

  const handleDispatch = (e: React.MouseEvent, inc: Incident, activeResourceId?: string) => {
    e.stopPropagation();

    if (inc.status === 'REPORTED') {
      if (activeResourceId && onDispatchResource) {
        const chosenRes = resources.find((r) => r.id === activeResourceId);
        const eta = chosenRes?.etaMinutes || 12;
        onDispatchResource(inc.id, activeResourceId, eta);
      } else {
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
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {sortedIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 font-mono text-xs text-center gap-2">
            <ShieldAlert className="w-8 h-8 text-slate-700" />
            <p>No active incidents</p>
          </div>
        )}
        {sortedIncidents.map((inc, index) => {
          const zoneScore = inc.zoneScore ?? inc.aiPriorityScore ?? 0;
          const { badge: rankBadge, bar: rankBar } = getRankStyle(index);
          const isTopRisk = index === 0;
          const isSelected = selectedIncidentId === inc.id;

          // Rank available resources for this specific disaster incident
          const recommendations = getRankedResourceRecommendations(inc, resources);
          const topRec = recommendations[0];

          // Determine currently selected resource ID for this incident
          const activeResourceId =
            customSelectedUnits[inc.id] ||
            topRec?.resource.id ||
            resources.find((r) => r.status === 'AVAILABLE')?.id;

          const currentRec =
            recommendations.find((r) => r.resource.id === activeResourceId) || topRec;

          return (
            <div
              key={inc.id}
              onClick={() => {
                onSelectIncident?.(inc.id);
                if (activeResourceId) {
                  onSelectResourceForRoute?.(inc.id, activeResourceId);
                }
              }}
              className={`group p-3 bg-slate-950/60 border rounded-lg transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-cyan-400 ring-1 ring-cyan-400/50 bg-slate-900/90 shadow-md shadow-cyan-950/50'
                  : isTopRisk
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

              {/* Dynamic LLM Resource Recommendation & Dropdown Unit Selector */}
              {inc.status === 'REPORTED' && (
                <div
                  className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <Bot className="w-3 h-3 text-cyan-400 animate-pulse" />
                      LLM AI DISPATCH RECOMMENDATION:
                    </span>
                    {currentRec && (
                      <span className="text-slate-400 text-[9px] font-semibold truncate max-w-[140px]">
                        {currentRec.stationName}
                      </span>
                    )}
                  </div>

                  {/* Dropdown Selector for Units */}
                  <select
                    value={activeResourceId || ''}
                    onChange={(e) => handleUnitSelect(inc.id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-cyan-500/60 text-[11px] font-mono text-cyan-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-all"
                  >
                    {recommendations.map((rec, idx) => (
                      <option key={rec.resource.id} value={rec.resource.id} className="bg-slate-950 text-slate-200">
                        {idx === 0 ? '⭐ AI Recommended: ' : 'Alt Unit Option: '}
                        {rec.resource.callsign} ({rec.resource.category}) • {rec.distanceKm}km (~{rec.etaMinutes}m ETA)
                      </option>
                    ))}
                    {recommendations.length === 0 && (
                      <option value="" disabled className="bg-slate-950 text-slate-500">
                        No resources available
                      </option>
                    )}
                  </select>

                  {/* AI Rationale Summary Text */}
                  {currentRec && (
                    <div className="text-[10px] font-mono text-slate-300 bg-cyan-950/40 border border-cyan-800/40 rounded p-1.5 flex items-start gap-1.5 leading-relaxed">
                      <Sparkles className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{currentRec.aiReason}</span>
                    </div>
                  )}
                </div>
              )}

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
                      onClick={(e) => handleDispatch(e, inc, activeResourceId)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all flex items-center gap-1 ${
                        inc.status === 'REPORTED'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/40 shadow-sm shadow-cyan-950/50'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-500/40'
                          : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/40'
                      }`}
                    >
                      {inc.status === 'REPORTED' && <Zap className="w-3 h-3 text-cyan-400" />}
                      {inc.status === 'REPORTED'
                        ? currentRec
                          ? `DISPATCH ${currentRec.resource.callsign}`
                          : 'DISPATCH UNIT'
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
