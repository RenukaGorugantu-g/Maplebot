// ==============================================================================
// MapleBot: My Daily Check-in & Work Performance Submission
// Direct Work Performance Table (Check-in & Deliverables) + Team Review Workspace
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataStore } from '../../services/dataStore';
import { MemberWorkTab } from '../performance/components/MemberWorkTab';
import { PodLeadReviewTab } from '../performance/components/PodLeadReviewTab';
import { ManagerReviewTab } from '../performance/components/ManagerReviewTab';
import { WarmGreetingBanner } from '../../components/ui/WarmGreetingBanner';
import { Table, CheckSquare, Users, Sparkles } from 'lucide-react';

export const MyUpdatePage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const { profile, userPod, isPodLead, isManager, isAdmin } = useAuth();
  const isPrivileged = Boolean(isPodLead || isManager || isAdmin);

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'my_tasks' | 'team_review'>('my_tasks');

  // Count pending reviews for badge
  const pendingCount = useMemo(() => {
    if (!isPrivileged) return 0;
    const podId = profile?.pod_id || userPod?.id;
    const logs = dataStore.getPerformanceWorkLogs(
      isAdmin ? {} : podId ? { podId } : {}
    );
    return logs.filter((l) => l.workflow_status === 'submitted' || !l.workflow_status).length;
  }, [isPrivileged, isAdmin, profile?.pod_id, userPod?.id]);

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Workspace Tab Switcher for Managers / Pod Leads / Admins */}
      {isPrivileged && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('my_tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeWorkspaceTab === 'my_tasks'
                  ? 'bg-maple-500 text-white shadow-lg shadow-maple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Log Previous Day's Tasks (My Entry)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('team_review')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeWorkspaceTab === 'team_review'
                  ? 'bg-maple-500 text-white shadow-lg shadow-maple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Team Submissions & Review Queue</span>
              {pendingCount > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeWorkspaceTab === 'team_review'
                    ? 'bg-white text-maple-600'
                    : 'bg-amber-500 text-slate-950'
                }`}>
                  {pendingCount} Pending
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium px-3">
            {userPod?.name || (isAdmin ? 'Admin Console' : 'Pod Workspace')}
          </span>
        </div>
      )}

      {/* Render Selected View */}
      {activeWorkspaceTab === 'my_tasks' ? (
        <>
          {/* Warm Uplifting Check-in Greeting Banner */}
          <WarmGreetingBanner
            variant="checkin"
            customSubtext="Take a moment to record your daily tasks, hours invested, and deliverables. Your team appreciates your dedication! 🌟"
          />

          {/* RENDER DIRECT WORK PERFORMANCE TABLE */}
          <MemberWorkTab />
        </>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Team Work Submissions & Review Queue
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-normal mt-1">
                {isManager || isAdmin ? 'Executive / Manager Review Queue' : 'Pod Lead Review Queue'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Review deliverables submitted by team members, inspect member feedback notes, evaluate error counts and quality, and dispatch constructive feedback to Google Chat.
              </p>
            </div>
          </div>

          {/* Render Pod Lead or Manager Review Tab directly */}
          {isManager || isAdmin ? <ManagerReviewTab /> : <PodLeadReviewTab />}
        </div>
      )}
    </div>
  );
};
