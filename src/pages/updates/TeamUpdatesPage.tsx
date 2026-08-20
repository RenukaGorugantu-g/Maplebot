import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { updatesService } from '../../services/updatesService';
import { dataStore } from '../../services/dataStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { GradientButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Search,
  AlertTriangle,
  Heart,
  Plus,
  Target,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const TeamUpdatesPage: React.FC<{
  onNavigate: (path: string) => void;
  selectedPodId?: string;
}> = ({ onNavigate, selectedPodId: initialPodId }) => {
  const { profile, currentRole } = useAuth();
  const { showToast } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPod, setSelectedPod] = useState<string>(
    initialPodId || (currentRole === 'manager' ? (profile?.pod_id || '') : '')
  );
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [onlyBlockers, setOnlyBlockers] = useState<boolean>(false);
  const [, setTick] = useState(0);

  // Sync with Supabase on mount and poll
  React.useEffect(() => {
    dataStore.refreshFromSupabase();
    const unsub = dataStore.subscribe(() => setTick((t) => t + 1));
    const interval = setInterval(() => {
      dataStore.refreshFromSupabase();
    }, 4000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const pods = dataStore.getPods();
  const allUpdates = updatesService.getUpdates({
    podId: selectedPod || undefined,
    status: statusFilter || undefined,
  });

  const filteredUpdates = allUpdates.filter((u) => {
    if (onlyBlockers && !u.has_blocker) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.yesterday.toLowerCase().includes(q) ||
      u.today.toLowerCase().includes(q) ||
      (u.blocker && u.blocker.toLowerCase().includes(q)) ||
      (u.profile?.full_name && u.profile.full_name.toLowerCase().includes(q)) ||
      (u.pod?.name && u.pod.name.toLowerCase().includes(q))
    );
  });

  const toggleComments = (updateId: string) => {
    setExpandedComments((prev) => ({ ...prev, [updateId]: !prev[updateId] }));
  };

  const handlePostComment = (updateId: string, authorName: string) => {
    const text = commentInputs[updateId]?.trim();
    if (!text) return;

    updatesService.addComment(updateId, profile?.id || 'prof-admin', profile?.full_name || 'Team Lead', text);
    setCommentInputs((prev) => ({ ...prev, [updateId]: '' }));
    showToast('success', 'Comment Dispatched', `Feedback on ${authorName}'s update was posted and sent to Google Chat Space!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
              Daily Standup Hub
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Team Standup Feed</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Asynchronous daily coordination feed synced with Google Chat space.
          </p>
        </div>

        <GradientButton
          size="md"
          onClick={() => onNavigate('/updates/my-update')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Submit My Update
        </GradientButton>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card p-4 border border-slate-800 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search standups, keywords, or members..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-maple-500/50"
          />
        </div>

        {/* Pod Filter */}
        <div className="relative">
          <select
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
          >
            <option value="">All Pods ({pods.length})</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="on_track">🟢 On Track</option>
            <option value="at_risk">🟡 At Risk</option>
            <option value="blocked">🔴 Blocked</option>
          </select>
        </div>

        {/* Blocker Toggle */}
        <button
          type="button"
          onClick={() => setOnlyBlockers(!onlyBlockers)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            onlyBlockers
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Only Blockers</span>
        </button>
      </div>

      {/* Standup Feed */}
      <div className="space-y-4">
        {filteredUpdates.length === 0 ? (
          <div className="glass-card p-12">
            <EmptyState
              title="No updates found"
              description="No team updates match your selected filters."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedPod('');
                setStatusFilter('');
                setOnlyBlockers(false);
              }}
            />
          </div>
        ) : (
          filteredUpdates.map((u) => {
            const isCommentsOpen = expandedComments[u.id];
            const commentList = u.comments || [];
            return (
              <div
                key={u.id}
                className="glass-card p-6 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.profile?.full_name || 'Member'} size="md" status="online" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">{u.profile?.full_name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-maple-400 border border-slate-700">
                          {u.pod?.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Submitted at {new Date(u.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(u.update_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <StatusBadge status={u.status} />
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                      u.priority === 'high'
                        ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                        : u.priority === 'medium'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {u.priority} priority
                    </span>
                  </div>
                </div>

                {/* Questions Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Yesterday */}
                  <div className="standup-block space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>What was completed yesterday</span>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed mt-1">
                      {u.yesterday}
                    </p>
                  </div>

                  {/* Today */}
                  <div className="standup-block space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                      <Target className="w-3.5 h-3.5 text-maple-400" />
                      <span>Working on today</span>
                    </div>
                    <p className="text-white font-medium text-xs leading-relaxed mt-1">
                      {u.today}
                    </p>
                  </div>
                </div>

                {/* Blocker Callout if any */}
                {u.has_blocker && (
                  <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        Active Blocker ({u.blocker_category || 'Task'})
                      </span>
                      <button
                        onClick={() => onNavigate('/blockers')}
                        className="text-[11px] text-rose-400 hover:text-white underline font-semibold"
                      >
                        Follow up on Blocker →
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed">{u.blocker}</p>
                    {u.support_needed && (
                      <p className="text-[11px] text-rose-400/90 pt-1">
                        <strong>Support Needed:</strong> {u.support_needed}
                      </p>
                    )}
                  </div>
                )}

                {/* Card Footer: Progress Bar & Reactions */}
                <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">
                      Daily Progress: <strong className="text-maple-400 font-bold">{u.progress_percent}%</strong>
                    </span>
                    <div className="w-28 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-maple-500 to-maple-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${u.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add Comment / Lead Feedback Button */}
                    <button
                      type="button"
                      onClick={() => toggleComments(u.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isCommentsOpen
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>Feedback & Comments ({commentList.length})</span>
                      {isCommentsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('/recognition/kudos')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/15 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>Give Kudos</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Feedback & Comments Box */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      Lead Feedback & Discussion ({commentList.length})
                    </h4>

                    {/* Past comments */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {commentList.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No feedback or comments yet. Add the first comment below.</p>
                      ) : (
                        commentList.map((c) => (
                          <div key={c.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-maple-400">{c.user_name}</span>
                              <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-300">{c.comment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add comment input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInputs[u.id] || ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePostComment(u.id, u.profile?.full_name || 'Team Member');
                        }}
                        placeholder={`Leave feedback for ${u.profile?.full_name}... (posts to Google Chat Space)`}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handlePostComment(u.id, u.profile?.full_name || 'Team Member')}
                        className="p-2 rounded-xl bg-maple-500 hover:bg-maple-400 text-slate-950 font-bold transition-all shadow-glow-sm"
                        title="Send Feedback"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
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
