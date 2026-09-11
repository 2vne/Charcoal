import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ResourceDistChartProps {
  data?: Array<{ name: string; deployed: number; available: number }>;
}

export const ResourceDistChart: React.FC<ResourceDistChartProps> = ({ data = [] }) => {
  return (
    <div className="w-full h-64 bg-slate-900/90 border border-slate-800 rounded-lg p-4 font-mono">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
          Resource Deployment vs Reserve Availability
        </h4>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-2 rounded bg-cyan-500" /> Deployed
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded bg-emerald-500" /> Available
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
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
          <Bar dataKey="deployed" fill="#06B6D4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="available" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
