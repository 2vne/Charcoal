import React from 'react';
import { useResources } from '../hooks/useResources';
import { RESOURCE_CATEGORY_LABELS } from '../utils/constants';
import { Truck, BatteryCharging, Radio, ShieldCheck, MapPin } from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { resources, updateResourceStatus } = useResources();

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4 font-mono">
      <div className="border-b border-slate-800 pb-3">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-400" />
          RESOURCE LOGISTICS & UNIT DISPATCH
        </h1>
        <p className="text-xs text-slate-400">
          Fleet telemetry, rescue equipment readiness, and communication channel assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((unit) => (
          <div
            key={unit.id}
            className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                  {RESOURCE_CATEGORY_LABELS[unit.category]}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    unit.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : unit.status === 'EN_ROUTE'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {unit.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100 mt-2">{unit.callsign}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{unit.currentLocation?.address || 'Base Station'}</span>
              </p>

              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">CREW SIZE:</span>
                  <div className="font-bold text-slate-200">{unit.personnelCount} Personnel</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">RADIO COMMS:</span>
                  <div className="font-bold text-cyan-400">{unit.contactChannel}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" /> Supply Reserve
                </span>
                <span className="font-bold text-slate-200">{unit.fuelOrSupplyPct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full"
                  style={{ width: `${unit.fuelOrSupplyPct}%` }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateResourceStatus(unit.id, 'AVAILABLE')}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded border border-slate-700"
                >
                  SET AVAILABLE
                </button>
                <button
                  onClick={() => updateResourceStatus(unit.id, 'EN_ROUTE')}
                  className="flex-1 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-[10px] font-bold rounded border border-cyan-500/40"
                >
                  DISPATCH
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
