import React from 'react';
import { ResourceUnit } from '../../types';
import { RESOURCE_CATEGORY_LABELS } from '../../utils/constants';
import { Truck, ShieldCheck, Activity, BatteryCharging } from 'lucide-react';

interface ResourceSummaryProps {
  resources: ResourceUnit[];
  onUpdateStatus?: (id: string, status: ResourceUnit['status']) => void;
}

export const ResourceSummary: React.FC<ResourceSummaryProps> = ({ resources }) => {
  const activeUnits = resources.filter((r) => r.status === 'ON_SITE' || r.status === 'EN_ROUTE').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
            Resource Readiness ({activeUnits}/{resources.length} Deployed)
          </h3>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {resources.map((res) => (
          <div
            key={res.id}
            className="p-2 bg-slate-950/60 border border-slate-800 rounded flex items-center justify-between text-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-100">{res.callsign}</span>
                <span className="text-[10px] font-mono text-slate-500">{RESOURCE_CATEGORY_LABELS[res.category]}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{res.currentLocation?.address || 'Base Location'}</p>
            </div>
            <div className="text-right font-mono">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  res.status === 'AVAILABLE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : res.status === 'EN_ROUTE'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {res.status}
              </span>
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                <BatteryCharging className="w-3 h-3 text-cyan-400" />
                <span>{res.fuelOrSupplyPct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
