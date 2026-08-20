import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 ${hoverable ? 'glass-card-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  progress,
  icon,
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 transition-all duration-200 ${
        onClick ? 'hover:border-maple-500/30 cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-maple-400">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
              trend.isPositive
                ? 'bg-maple-500/10 text-maple-400 border border-maple-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>Completion Rate</span>
            <span className="text-maple-400 font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-maple-500 to-maple-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
