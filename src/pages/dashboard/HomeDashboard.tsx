import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { updatesService } from '../../services/updatesService';
import { blockersService } from '../../services/blockersService';
import { dataStore } from '../../services/dataStore';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge, SeverityBadge } from '../../components/ui/StatusBadge';
import { Button, GradientButton } from '../../components/ui/Button';
import { UpdateStatus, BlockerCategory } from '../../types/database';
import {
  CheckSquare,
  Users,
  AlertTriangle,
  Flame,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Heart,
  BarChart2,
  FileSpreadsheet,
  Table,
} from 'lucide-react';

import { WarmGreetingBanner } from '../../components/ui/WarmGreetingBanner';

export const HomeDashboard: React.FC<{
  onNavigate: (path: string) => void;
  selectedPodId?: string;
}> = ({ onNavigate }) => {
  const { profile, currentRole, userPod } = useAuth();
  const { showToast } = useNotifications();

  // Standup submission inline state for members
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blocker, setBlocker] = useState('');
  const [blockerCategory, setBlockerCategory] = useState<BlockerCategory>('Task');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [status, setStatus] = useState<UpdateStatus>('on_track');
  const [progress, setProgress] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayUpdate = profile?.id
    ? updatesService.getUpdates({
        profileId: profile.id,
        date: todayStr,
      })[0]
    : undefined;

  const pods = dataStore.getPods();
  const activePod = userPod || pods[0];

  // Pod-scoped data for manager
  const podUpdates = activePod ? updatesService.getUpdates({ podId: activePod.id }) : [];
  const podBlockers = activePod ? blockersService.getBlockers({ podId: activePod.id, status: 'open' }) : [];
  const podMembers = activePod ? dataStore.getProfiles().filter((m) => m.pod_id === activePod.id) : [];
  const podSubmittedCount = podUpdates.filter((u) => u.update_date === todayStr).length;
  const podParticipation = podMembers.length > 0 ? Math.round((podSubmittedCount / podMembers.length) * 100) : 0;

  // Org-wide data for admin
  const allUpdates = updatesService.getUpdates();
  const allBlockers = blockersService.getBlockers({ status: 'open' });
  const allMembers = dataStore.getProfiles();
  const orgSubmittedCount = allUpdates.filter((u) => u.update_date === todayStr).length;
  const orgParticipation = allMembers.length > 0 ? Math.round((orgSubmittedCount / allMembers.length) * 100) : 0;

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yesterday.trim() || !today.trim()) {
      showToast('warning', 'Incomplete Standup', 'Please fill in what was completed and today\'s plan.');
      return;
    }

    setIsSubmitting(true);
    updatesService.submitUpdate({
      organization_id: profile?.organization_id || 'org-maple-01',
      checkin_id: 'chk-maple-daily',
      profile_id: profile?.id || '',
      pod_id: profile?.pod_id,
      update_date: todayStr,
      yesterday,
      today,
      has_blocker: hasBlocker,
      blocker: hasBlocker ? blocker : undefined,
      blocker_category: hasBlocker ? blockerCategory : undefined,
      support_needed: hasBlocker ? supportNeeded : undefined,
      status,
      priority: 'high',
      progress_percent: progress,
    });

    setIsSubmitting(false);
    showToast('success', 'Update Logged!', 'Your daily standup has been submitted to your team.');
  };

  // ============================================================================
  // 1. MEMBER DASHBOARD VIEW
  // ============================================================================
  if (currentRole === 'member') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Warm Welcome Greeting Banner */}
        <WarmGreetingBanner
          variant="dashboard"
          actionLabel="Log Previous Day's Work Tasks & Deliverables"
          onActionClick={() => onNavigate('/performance')}
        />

        {/* Prominent Work Performance Ledger Quick Banner */}
        <div className="glass-card p-5 border border-maple-500/40 bg-gradient-to-r from-[#081426] via-[#091a30] to-[#081426] relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-maple-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-maple-400">
                Work Performance & Deliverables Ledger
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Structured Work Performance Table (9 Fields)
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Track completed units, project deliverables, and hours invested with automated Pod Lead review and Maple AI executive reporting.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <GradientButton
              size="sm"
              onClick={() => onNavigate('/performance')}
              leftIcon={<Table className="w-4 h-4" />}
            >
              Open Work Ledger
            </GradientButton>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/updates/my-update')}
              leftIcon={<CheckSquare className="w-4 h-4 text-maple-400" />}
            >
              My Check-in
            </Button>
          </div>
        </div>

        {/* Prominent Today's Work Performance Check-in Card */}
        {(() => {
          const myTodayLogs = dataStore.getPerformanceWorkLogs({
            employeeId: profile?.id,
            startDate: todayStr,
            endDate: todayStr,
          });
          const hasLoggedToday = myTodayLogs.length > 0;
          const totalLoggedHours = Math.round(myTodayLogs.reduce((acc, l) => acc + (Number(l.time_invested) || 0), 0) * 10) / 10;
          const totalLoggedUnits = myTodayLogs.reduce((acc, l) => acc + (Number(l.unit_count_completed) || 0), 0);

          return (
            <div className="glass-card p-6 lg:p-8 border border-slate-800 relative overflow-hidden space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-maple-500/10 text-maple-400 border border-maple-500/20">
                    <Table className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Previous Day's Work Tasks & Deliverables</h3>
                    <span className="text-xs text-slate-400">
                      {hasLoggedToday
                        ? `${myTodayLogs.length} deliverable task(s) logged (${totalLoggedHours} hrs)`
                        : 'Awaiting your previous day deliverables and work check-in'}
                    </span>
                  </div>
                </div>

                {hasLoggedToday ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Logged for Today
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center">
                    <Clock className="w-3.5 h-3.5" /> Pending Work Log
                  </span>
                )}
              </div>

              {hasLoggedToday ? (
                /* Completed Today Work Performance Summary */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasks Logged</span>
                      <span className="text-lg font-bold text-white font-mono">{myTodayLogs.length}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-sky-400 block">Total Hours</span>
                      <span className="text-lg font-bold text-sky-400 font-mono">{totalLoggedHours} hrs</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-purple-300 block">Units Completed</span>
                      <span className="text-lg font-bold text-purple-300 font-mono">{totalLoggedUnits} items</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#060E1A] overflow-hidden">
                    {myTodayLogs.map((log) => (
                      <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-800/30 text-xs">
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold text-slate-100">{log.task || log.task_title}</p>
                          {log.comments && <p className="text-slate-400 text-[11px] italic">"{log.comments}"</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <span className="text-sky-400 font-bold">{log.time_invested || log.duration_hours}h</span>
                          <span className="text-purple-300 font-bold">{log.unit_count_completed || 1} items</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <GradientButton
                      size="sm"
                      onClick={() => onNavigate('/updates/my-update')}
                      leftIcon={<Table className="w-4 h-4" />}
                    >
                      Open Work Performance Table
                    </GradientButton>
                  </div>
                </div>
              ) : (
                /* Prompt to log Work Performance Check-in */
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Log your deliverables, task description, hours invested, and completed units directly in your Previous Day's Work Tasks Table.
                  </p>
                  <GradientButton
                    size="sm"
                    onClick={() => onNavigate('/performance')}
                    leftIcon={<Table className="w-4 h-4" />}
                  >
                    Log Previous Day's Work Tasks & Deliverables
                  </GradientButton>
                </div>
              )}
            </div>
          );
        })()}

        {/* Personal Action Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('/updates/history')}
            className="glass-card p-4 border border-slate-800 hover:border-slate-700 cursor-pointer space-y-1 transition-all"
          >
            <span className="text-xs font-bold text-white block">My Updates</span>
            <p className="text-[11px] text-slate-400">View timeline of previous daily standups</p>
          </div>

          <div
            onClick={() => onNavigate('/blockers')}
            className="glass-card p-4 border border-slate-800 hover:border-slate-700 cursor-pointer space-y-1 transition-all"
          >
            <span className="text-xs font-bold text-white block">My Blockers</span>
            <p className="text-[11px] text-slate-400">Track and resolve flagged impediments</p>
          </div>

          <div
            onClick={() => onNavigate('/recognition/kudos')}
            className="glass-card p-4 border border-slate-800 hover:border-slate-700 cursor-pointer space-y-1 transition-all"
          >
            <span className="text-xs font-bold text-white block">Send Kudos</span>
            <p className="text-[11px] text-slate-400">Appreciate and recognize teammates</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. MANAGER DASHBOARD VIEW (Pod-Scoped Cockpit)
  // ============================================================================
  if (currentRole === 'manager') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Pod Banner */}
        <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
                Pod Lead Cockpit
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activePod.name} — Today's Team Status
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Live updates, blockers, and participation for {activePod.name} pod members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/updates/my-update')}
              leftIcon={<CheckSquare className="w-4 h-4 text-maple-400" />}
            >
              Give My Update
            </Button>
            <GradientButton
              size="sm"
              onClick={() => onNavigate('/performance')}
              leftIcon={<Table className="w-4 h-4" />}
            >
              Work Performance Review (17 Cols)
            </GradientButton>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/updates/team')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Pod Updates Feed
            </Button>
          </div>
        </div>

        {/* Work Performance System Highlight Card */}
        <div className="glass-card p-5 border border-maple-500/40 bg-gradient-to-r from-[#081426] via-[#091a30] to-[#081426] relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-maple-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-maple-400">
                Performance Governance & Executive Intelligence
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Pod Member Submission → Pod Lead Review → Manager Performance Assessment
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Inspect member deliverables, verify review dates & error counts, assess Quality ratings, and generate Maple AI corporate executive reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <GradientButton
              size="sm"
              onClick={() => onNavigate('/performance')}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Open Performance Module
            </GradientButton>
          </div>
        </div>

        {/* Pod KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Participation</span>
            <p className="text-2xl font-black text-white">{podParticipation}%</p>
            <span className="text-[11px] text-slate-400 block">{podSubmittedCount} of {podMembers.length} submitted</span>
          </div>

          <div className="glass-card p-4 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">On Track</span>
            <p className="text-2xl font-black text-emerald-400">
              {podUpdates.filter((u) => u.status === 'on_track').length}
            </p>
            <span className="text-[11px] text-slate-400 block">Deliverables progressing</span>
          </div>

          <div className="glass-card p-4 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">At Risk / Blocked</span>
            <p className="text-2xl font-black text-rose-400">
              {podUpdates.filter((u) => u.status === 'at_risk' || u.status === 'blocked').length}
            </p>
            <span className="text-[11px] text-slate-400 block">Require follow-up</span>
          </div>

          <div className="glass-card p-4 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Open Blockers</span>
            <p className="text-2xl font-black text-amber-400">{podBlockers.length}</p>
            <span className="text-[11px] text-slate-400 block">Active impediments</span>
          </div>
        </div>

        {/* Recent Pod Updates Feed */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Today's Pod Submissions</h3>
            <button
              onClick={() => onNavigate('/updates/team')}
              className="text-xs text-maple-400 hover:text-maple-300 font-semibold"
            >
              View Full Feed →
            </button>
          </div>

          <div className="space-y-3">
            {podUpdates.map((u) => (
              <div key={u.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.profile?.full_name || 'User'} src={u.profile?.avatar_url} size="xs" />
                    <span className="font-bold text-white">{u.profile?.full_name}</span>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed</span>
                    <p className="line-clamp-2">{u.yesterday}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-maple-400 uppercase font-semibold block">Working On</span>
                    <p className="line-clamp-2 text-white">{u.today}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ADMIN DASHBOARD VIEW (Executive Organization View)
  // ============================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Banner */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
              Organization Executive View
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">Maple Learning Solutions</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Company Standup Overview
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Cross-pod participation, blocker velocity, and operational analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/updates/my-update')}
            leftIcon={<CheckSquare className="w-4 h-4 text-maple-400" />}
          >
            Give My Update
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/performance')}
            leftIcon={<Table className="w-4 h-4 text-sky-400" />}
          >
            Work Performance Table
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/reports')}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Export Reports
          </Button>
          <GradientButton
            size="sm"
            onClick={() => onNavigate('/analytics/daily')}
            leftIcon={<BarChart2 className="w-4 h-4" />}
          >
            Daily Analytics
          </GradientButton>
        </div>
      </div>

      {/* Cross-Org KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Members</span>
          <p className="text-2xl font-black text-white">{allMembers.length}</p>
          <span className="text-[11px] text-slate-400 block">{pods.length} active pods</span>
        </div>

        <div className="glass-card p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Submitted Today</span>
          <p className="text-2xl font-black text-emerald-400">{orgSubmittedCount}</p>
          <span className="text-[11px] text-slate-400 block">{orgParticipation}% completion rate</span>
        </div>

        <div className="glass-card p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Active Blockers</span>
          <p className="text-2xl font-black text-rose-400">{allBlockers.length}</p>
          <span className="text-[11px] text-slate-400 block">Across all pods</span>
        </div>

        <div className="glass-card p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Sprint 56 Velocity</span>
          <p className="text-2xl font-black text-maple-400">89%</p>
          <span className="text-[11px] text-slate-400 block">On schedule</span>
        </div>
      </div>

      {/* 4 Pod Performance Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pod Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pods.map((p) => {
            const pUpdates = updatesService.getUpdates({ podId: p.id });
            const pMembers = dataStore.getProfiles().filter((m) => m.pod_id === p.id);
            const pSubmitted = pUpdates.filter((u) => u.update_date === todayStr).length;
            const pRate = pMembers.length > 0 ? Math.round((pSubmitted / pMembers.length) * 100) : 0;
            const pBlockers = blockersService.getBlockers({ podId: p.id, status: 'open' });

            return (
              <div key={p.id} className="glass-card p-5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{p.name}</h4>
                  <span className="text-xs font-bold text-maple-400 font-mono">{pRate}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-maple-400 h-1.5 rounded-full" style={{ width: `${pRate}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{pSubmitted}/{pMembers.length} Submitted</span>
                  <span className={pBlockers.length > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                    {pBlockers.length} Blockers
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
