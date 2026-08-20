import { UpdateStatus, BlockerSeverity, BlockerStatus, UserStatus } from '../../types/database';

interface StatusBadgeProps {
  status: UpdateStatus | BlockerStatus | UserStatus | 'pending';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const config: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    on_track: {
      label: 'On Track',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    at_risk: {
      label: 'At Risk',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-400',
    },
    blocked: {
      label: 'Blocked',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dot: 'bg-rose-400',
    },
    open: {
      label: 'Open',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dot: 'bg-rose-400',
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      dot: 'bg-blue-400',
    },
    resolved: {
      label: 'Resolved',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    closed: {
      label: 'Closed',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      dot: 'bg-slate-400',
    },
    active: {
      label: 'Active',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    deactivated: {
      label: 'Deactivated',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      dot: 'bg-slate-400',
    },
    pending: {
      label: 'Pending',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-400',
    },
  };

  const item = config[status] || config.on_track;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${item.bg} ${item.text} ${item.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: BlockerSeverity }> = ({ severity }) => {
  const map: Record<BlockerSeverity, { label: string; style: string }> = {
    low: { label: 'Low', style: 'bg-slate-800 text-slate-300 border-slate-700' },
    medium: { label: 'Medium', style: 'bg-amber-950/40 text-amber-300 border-amber-800/40' },
    high: { label: 'High', style: 'bg-orange-950/40 text-orange-300 border-orange-800/40' },
    critical: { label: 'Critical', style: 'bg-rose-950/50 text-rose-300 border-rose-800/50 animate-pulse-subtle' },
  };

  const item = map[severity] || map.medium;

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${item.style}`}>
      {item.label}
    </span>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'maple' | 'blue' | 'purple' | 'amber' | 'slate';
  className?: string;
}> = ({ children, variant = 'slate', className = '' }) => {
  const styles = {
    maple: 'bg-maple-500/10 text-maple-400 border-maple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
