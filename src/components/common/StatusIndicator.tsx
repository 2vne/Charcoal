import React from 'react';

export type StatusVariant = 'online' | 'active' | 'warning' | 'danger' | 'offline';

interface StatusIndicatorProps {
  status: StatusVariant;
  label?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = true,
}) => {
  const colors: Record<StatusVariant, { dot: string; text: string; bg: string }> = {
    online: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    active: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    warning: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/20' },
    danger: { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/20' },
    offline: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/20' },
  };

  const style = colors[status];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status !== 'offline' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`} />
      </span>
      {label && <span className={`text-xs font-mono font-medium ${style.text}`}>{label}</span>}
    </div>
  );
};
