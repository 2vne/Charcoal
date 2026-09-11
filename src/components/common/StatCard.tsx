import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'red' | 'orange' | 'yellow' | 'cyan' | 'emerald' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'cyan',
}) => {
  const accentClasses = {
    red: 'border-l-red-500 text-red-400 bg-red-500/5',
    orange: 'border-l-orange-500 text-orange-400 bg-orange-500/5',
    yellow: 'border-l-yellow-500 text-yellow-400 bg-yellow-500/5',
    cyan: 'border-l-cyan-500 text-cyan-400 bg-cyan-500/5',
    emerald: 'border-l-emerald-500 text-emerald-400 bg-emerald-500/5',
    blue: 'border-l-blue-500 text-blue-400 bg-blue-500/5',
  }[accentColor];

  const iconBg = {
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[accentColor];

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 border-l-4 rounded-r-lg p-4 transition-all duration-200 hover:border-slate-700 ${accentClasses}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded border ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-mono font-bold text-slate-100">{value}</span>
        {trend && (
          <span
            className={`text-xs font-mono font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-500 mt-1 font-mono">{subtitle}</p>}
    </div>
  );
};
