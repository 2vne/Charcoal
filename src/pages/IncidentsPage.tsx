import React, { useState } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { formatDateTime } from '../utils/formatters';
import { IncidentStatus, SeverityLevel } from '../types';
import { AlertTriangle, Filter, Search, MapPin, Users, CheckCircle, Truck } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const { incidents, updateIncidentStatus } = useIncidents();
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      (inc.location?.address || '').toLowerCase().includes(search.toLowerCase());
    const matchesSev = selectedSeverity === 'ALL' || inc.severity === selectedSeverity;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-mono font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            INCIDENT TRIAGE & MANAGEMENT LOG
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Real-time distress signals, casualty counts, and dispatch workflow.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500 w-48 sm:w-64"
            />
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">ID / Severity</th>
              <th className="p-3">Incident Title</th>
              <th className="p-3">Location / Zone</th>
              <th className="p-3">Casualties</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reported At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredIncidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 space-y-1">
                  <span className="font-bold text-slate-100">{inc.id}</span>
                  <div>
                    <SeverityBadge severity={inc.severity} size="sm" />
                  </div>
                </td>

                <td className="p-3 max-w-xs">
                  <div className="font-semibold text-slate-100">{inc.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{inc.description}</p>
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-1 text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{inc.location?.address || 'Field Location'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{inc.location?.zone || 'Disaster Zone'}</div>
                </td>

                <td className="p-3">
                  <div>
                    Stranded: <strong className="text-amber-400">{inc.strandedCount}</strong>
                  </div>
                  <div className="text-slate-400">
                    Injured: <strong className="text-red-400">{inc.injuredCount}</strong>
                  </div>
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.status === 'REPORTED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : inc.status === 'DISPATCHED'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : inc.status === 'ON_SITE'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {inc.status}
                  </span>
                </td>

                <td className="p-3 text-[11px] text-slate-400">{formatDateTime(inc.reportedAt)}</td>

                <td className="p-3 text-right">
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() =>
                        updateIncidentStatus(
                          inc.id,
                          inc.status === 'REPORTED'
                            ? 'DISPATCHED'
                            : inc.status === 'DISPATCHED'
                            ? 'ON_SITE'
                            : 'RESOLVED'
                        )
                      }
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold border border-slate-700 text-[10px]"
                    >
                      {inc.status === 'REPORTED'
                        ? 'DISPATCH'
                        : inc.status === 'DISPATCHED'
                        ? 'MARK ON-SITE'
                        : 'RESOLVE'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
