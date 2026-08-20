import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updatesService } from '../../services/updatesService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Calendar,
  Flame,
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export const UpdateHistoryPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const { profile } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const myUpdates = profile?.id ? updatesService.getUpdates({ profileId: profile.id }) : [];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
              Personal Standup Log
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">My Updates</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Timeline of your submitted standups, tasks, and blocker resolutions.
          </p>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-center">
          <Flame className="w-4 h-4 text-amber-400" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Streak</span>
            <span className="font-extrabold text-white">14 Consecutive Days</span>
          </div>
        </div>
      </div>

      {/* Updates Timeline List */}
      <div className="space-y-3">
        {myUpdates.length === 0 ? (
          <div className="glass-card p-8">
            <EmptyState
              title="No updates logged yet"
              description="Your daily standups will appear in this timeline once submitted."
            />
          </div>
        ) : (
          myUpdates.map((u) => {
            const isExpanded = expandedId === u.id;
            return (
              <div
                key={u.id}
                className="glass-card border border-slate-800 overflow-hidden hover:border-slate-700/80 transition-all"
              >
                {/* Summary Row */}
                <div
                  onClick={() => toggleExpand(u.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-maple-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">
                        {new Date(u.update_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {u.today}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <StatusBadge status={u.status} />
                    <span className="text-xs font-semibold text-slate-300 font-mono">
                      {u.progress_percent}%
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-900/40 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Completed</span>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-line">{u.yesterday}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-maple-400">Today's Focus</span>
                        <p className="text-white leading-relaxed whitespace-pre-line">{u.today}</p>
                      </div>
                    </div>

                    {u.has_blocker && (
                      <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 space-y-1">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Blocker: {u.blocker_category || 'General'}
                        </span>
                        <p className="text-xs">{u.blocker}</p>
                        {u.support_needed && (
                          <p className="text-[11px] text-rose-400/80 pt-0.5">
                            <strong>Support Needed:</strong> {u.support_needed}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
