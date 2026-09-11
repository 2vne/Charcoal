import React from 'react';
import { SeverityLevel } from '../../types';
import { SEVERITY_COLORS } from '../../utils/constants';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  animate = true,
}) => {
  const styles = SEVERITY_COLORS[severity];

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider font-mono',
    md: 'text-xs px-2.5 py-1 tracking-wider font-mono font-semibold',
    lg: 'text-sm px-3.5 py-1.5 tracking-widest font-mono font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded uppercase border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${
        severity === 'CRITICAL' && animate ? 'animate-pulse-fast border-red-500 shadow-glow-critical' : ''
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          severity === 'CRITICAL'
            ? 'bg-red-500 animate-ping'
            : severity === 'HIGH'
            ? 'bg-orange-500'
            : severity === 'MEDIUM'
            ? 'bg-yellow-500'
            : 'bg-blue-500'
        }`}
      />
      {severity}
    </span>
  );
};
