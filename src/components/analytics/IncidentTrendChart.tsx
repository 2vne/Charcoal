import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface IncidentTrendChartProps {
  data?: Array<{ time: string; critical: number; high: number; medium: number }>;
}

export const IncidentTrendChart: React.FC<IncidentTrendChartProps> = ({ data = [] }) => {
  return (
    <div className="w-full h-64 bg-slate-900/90 border border-slate-800 rounded-lg p-4 font-mono">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
          Incident Volume & Escalation Rate (24h Telemetry)
        </h4>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded bg-red-500" /> Critical
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2 h-2 rounded bg-orange-500" /> High
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="w-2 h-2 rounded bg-yellow-500" /> Medium
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
          <YAxis stroke="#64748B" fontSize={10} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#334155',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#F8FAFC',
            }}
          />
          <Area
            type="monotone"
            dataKey="critical"
            stroke="#EF4444"
            fillOpacity={1}
            fill="url(#colorCritical)"
          />
          <Area
            type="monotone"
            dataKey="high"
            stroke="#F97316"
            fillOpacity={1}
            fill="url(#colorHigh)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
