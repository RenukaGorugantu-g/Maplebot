import React from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'away' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-12 h-12 text-base font-bold',
    xl: 'w-16 h-16 text-lg font-extrabold',
  };

  const getInitials = (n: string) => {
    if (!n) return 'M';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  // Deterministic vibrant gradient background based on member name
  const getGradientTheme = (n: string) => {
    const themes = [
      'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm border border-emerald-400/30',
      'bg-gradient-to-br from-maple-400 to-emerald-600 text-slate-950 shadow-sm border border-maple-400/40',
      'bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-sm border border-cyan-400/30',
      'bg-gradient-to-br from-indigo-500 to-purple-700 text-white shadow-sm border border-indigo-400/30',
      'bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-sm border border-amber-400/30',
      'bg-gradient-to-br from-pink-500 to-rose-700 text-white shadow-sm border border-pink-400/30',
      'bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white shadow-sm border border-violet-400/30',
    ];
    let hash = 0;
    for (let i = 0; i < (n || 'M').length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    return themes[Math.abs(hash) % themes.length];
  };

  const statusColors = {
    online: 'bg-emerald-400',
    busy: 'bg-rose-400',
    away: 'bg-amber-400',
    offline: 'bg-slate-500',
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold tracking-tight transition-transform hover:scale-105 ${getGradientTheme(
          name
        )}`}
      >
        {getInitials(name)}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#081426] ${statusColors[status]}`}
        />
      )}
    </div>
  );
};
