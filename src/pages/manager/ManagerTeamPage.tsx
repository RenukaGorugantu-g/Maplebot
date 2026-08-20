import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { updatesService } from '../../services/updatesService';
import { blockersService } from '../../services/blockersService';
import { dataStore } from '../../services/dataStore';
import { googleChatService } from '../../services/googleChatService';
import { MetricCard } from '../../components/ui/Card';
import { StatusBadge, SeverityBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { Button, GradientButton } from '../../components/ui/Button';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Bell,
  Sparkles,
  Search,
  Filter,
  Plus
} from 'lucide-react';

export const ManagerTeamPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  const podId = profile.pod_id || 'pod-web-sales';
  const pod = dataStore.getPodById(podId);

  const stats = updatesService.getSubmissionStats(podId);
  const podMembers = dataStore
    .getProfiles()
    .filter((m) => (m.pod_id === podId || (m.pod_ids && m.pod_ids.includes(podId))) && m.status === 'active');
  const podUpdates = updatesService.getTodayUpdates(podId);
  const podBlockers = blockersService.getBlockers({ podId, status: 'open' });

  const [searchMember, setSearchMember] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const handleSendReminder = async (member: { email: string; full_name: string }) => {
    const res = await googleChatService.sendStandupReminder(member.email, member.full_name, pod?.name || 'Pod');
    showToast('success', 'Google Chat Reminder Sent', res.message);
  };

  const handleRemindAllPending = async () => {
    const pendingMembers = podMembers.filter((m) => !updatesService.getMemberUpdateToday(m.id));
    for (const m of pendingMembers) {
      await googleChatService.sendStandupReminder(m.email, m.full_name, pod?.name || 'Pod');
    }
    showToast('success', 'Google Chat Reminders Broadcasted', `Dispatched standup reminders to ${pendingMembers.length} pending members via Google Chat.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Pod Cockpit Header */}
      <div className="glass-card p-6 lg:p-8 bg-gradient-to-r from-[#081426] via-[#0B1728] to-[#101D2F] border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
                Pod Manager Cockpit
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {pod?.name || 'Web & Sales'} — Team Overview
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {pod?.description || 'Front-end development, CRM systems, web platforms, and client conversions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {stats.pendingCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRemindAllPending}
                leftIcon={<Bell className="w-4 h-4 text-amber-400" />}
              >
                Remind All Pending ({stats.pendingCount})
              </Button>
            )}
            <GradientButton
              size="sm"
              onClick={() => onNavigate('/ai')}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Generate AI Pod Summary
            </GradientButton>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pod Members"
          value={podMembers.length}
          subtitle="Direct reports"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Submitted Today"
          value={`${stats.submittedCount} / ${stats.totalExpected}`}
          progress={stats.participationRate}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <MetricCard
          title="Pending Today"
          value={stats.pendingCount}
          subtitle={stats.pendingCount === 0 ? 'All checked in!' : 'Action needed'}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Active Blockers"
          value={podBlockers.length}
          subtitle={podBlockers.length === 0 ? 'Zero impediments' : 'Requires follow-up'}
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
        />
      </div>

      {/* Pod Member Roster Table */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Pod Member Roster & Today's Status</h3>
          <span className="text-xs text-slate-400">{podMembers.length} members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Today's Check-in</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {podMembers.map((member) => {
                const update = updatesService.getMemberUpdateToday(member.id);
                const isSubmitted = !!update;
                return (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <Avatar name={member.full_name} src={member.avatar_url} size="sm" />
                      <div>
                        <span className="font-semibold text-white block">{member.full_name}</span>
                        <span className="text-[11px] text-slate-400">{member.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 capitalize font-medium text-slate-300">
                      {member.role}
                    </td>
                    <td className="px-4 py-3.5">
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted ({new Date(update.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Check-in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isSubmitted ? (
                        <StatusBadge status={update.status} />
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!isSubmitted ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSendReminder(member)}
                          leftIcon={<Bell className="w-3 h-3 text-amber-400" />}
                        >
                          Ping Reminder
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate('/updates/team')}
                        >
                          View Update
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pod Feed */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Pod Standup Submissions Today</h3>

        <div className="space-y-3">
          {podUpdates.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No updates submitted by pod members yet today.</p>
          ) : (
            podUpdates.map((u) => (
              <div key={u.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.profile?.full_name || ''} size="xs" />
                    <span className="font-bold text-white">{u.profile?.full_name}</span>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <p className="text-slate-300"><strong>Today:</strong> {u.today}</p>
                {u.has_blocker && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300">
                    <strong>Blocker:</strong> {u.blocker}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
