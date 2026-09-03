// ==============================================================================
// MapleBot: Work Performance, Review & Maple AI Executive Reporting Master Module
// Dynamic Role-Based Workspaces: Member, Pod Lead, Manager & Executive / Admin
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MemberWorkTab } from './components/MemberWorkTab';
import { PodLeadReviewTab } from './components/PodLeadReviewTab';
import { ManagerReviewTab } from './components/ManagerReviewTab';
import { MapleAIExecutiveConsole } from './components/MapleAIExecutiveConsole';
import { PerformanceDashboardTab } from './components/PerformanceDashboardTab';
import { KraKpiTab } from './components/KraKpiTab';
import { ReportHistoryTab } from './components/ReportHistoryTab';
import { SprintReviewAnalyticsCockpit } from './components/SprintReviewAnalyticsCockpit';
import { LeavePlannerPage } from '../leaves/LeavePlannerPage';
import {
  Table,
  CheckSquare,
  Sparkles,
  BarChart2,
  Target,
  History,
  Users,
  Award,
  Zap,
  CalendarDays,
} from 'lucide-react';

export type PerformanceTabId =
  | 'member_work'
  | 'pod_review'
  | 'manager_review'
  | 'sprint_analytics'
  | 'leave_planner'
  | 'maple_ai_reports'
  | 'dashboard'
  | 'kra_kpi'
  | 'history';

interface TabItem {
  id: PerformanceTabId;
  label: string;
  icon: React.ReactNode;
}

export const PerformanceModulePage: React.FC<{ initialTab?: string }> = ({
  initialTab,
}) => {
  const { currentRole, userPod, profile } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';
  const isMember = currentRole === 'member';

  // Default initial tab based on role
  const defaultTab: PerformanceTabId = isMember
    ? 'member_work'
    : isManager
    ? 'pod_review'
    : 'manager_review';

  const [activeTab, setActiveTab] = useState<PerformanceTabId>(
    (initialTab as PerformanceTabId) || defaultTab
  );
  const [focusedEmployeeId, setFocusedEmployeeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'dashboard') setActiveTab('dashboard');
      else if (initialTab === 'sprint-analytics' || initialTab === 'sprint_analytics') setActiveTab('sprint_analytics');
      else if (initialTab === 'work-data') setActiveTab(isMember ? 'member_work' : isManager ? 'pod_review' : 'manager_review');
      else if (initialTab === 'individual-reports') setActiveTab('maple_ai_reports');
      else if (initialTab === 'team-reports') setActiveTab('maple_ai_reports');
      else if (initialTab === 'kra-kpi') setActiveTab('kra_kpi');
      else if (initialTab === 'history') setActiveTab('history');
    }
  }, [initialTab]);

  // Build role-appropriate tabs
  const tabs: TabItem[] = [];

  if (isMember) {
    tabs.push({
      id: 'member_work',
      label: 'My Work Updates (9 Fields)',
      icon: <Table className="w-4 h-4" />,
    });
    tabs.push({
      id: 'sprint_analytics',
      label: 'Sprint Tasks & Analytics',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    });
    tabs.push({
      id: 'leave_planner',
      label: 'Leave Planner & Holidays',
      icon: <CalendarDays className="w-4 h-4 text-emerald-400" />,
    });
    tabs.push({
      id: 'maple_ai_reports',
      label: 'My Performance Report',
      icon: <Sparkles className="w-4 h-4" />,
    });
  } else if (isManager) {
    tabs.push({
      id: 'member_work',
      label: 'Log My Work Tasks (9 Fields)',
      icon: <Table className="w-4 h-4 text-maple-400" />,
    });
    tabs.push({
      id: 'pod_review',
      label: 'Pod Work Review (5 Fields)',
      icon: <CheckSquare className="w-4 h-4 text-sky-400" />,
    });
    tabs.push({
      id: 'manager_review',
      label: 'Pod Performance Ledger (17 Cols)',
      icon: <Table className="w-4 h-4" />,
    });
    tabs.push({
      id: 'leave_planner',
      label: 'Leave Planner & Holidays',
      icon: <CalendarDays className="w-4 h-4 text-emerald-400" />,
    });
    tabs.push({
      id: 'sprint_analytics',
      label: 'Sprint & Review Analytics',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    });
    tabs.push({
      id: 'maple_ai_reports',
      label: 'Maple AI Reports',
      icon: <Sparkles className="w-4 h-4" />,
    });
    tabs.push({
      id: 'dashboard',
      label: 'Performance Snapshot',
      icon: <BarChart2 className="w-4 h-4" />,
    });
    tabs.push({
      id: 'kra_kpi',
      label: 'KRA / KPI Goals',
      icon: <Target className="w-4 h-4" />,
    });
    tabs.push({
      id: 'history',
      label: 'Report Archive',
      icon: <History className="w-4 h-4" />,
    });
  } else {
    // Admin / Executive
    tabs.push({
      id: 'manager_review',
      label: 'Consolidated Work Table (All 17 Columns)',
      icon: <Table className="w-4 h-4" />,
    });
    tabs.push({
      id: 'sprint_analytics',
      label: '1-Click Sprint & Review Analytics',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    });
    tabs.push({
      id: 'leave_planner',
      label: 'Leave Planner & Holidays',
      icon: <CalendarDays className="w-4 h-4 text-emerald-400" />,
    });
    tabs.push({
      id: 'pod_review',
      label: 'Pod Review Queue',
      icon: <CheckSquare className="w-4 h-4" />,
    });
    tabs.push({
      id: 'maple_ai_reports',
      label: 'Maple AI Executive Reports',
      icon: <Sparkles className="w-4 h-4" />,
    });
    tabs.push({
      id: 'dashboard',
      label: 'Performance Dashboard',
      icon: <BarChart2 className="w-4 h-4" />,
    });
    tabs.push({
      id: 'kra_kpi',
      label: 'KRA / KPI Architecture',
      icon: <Target className="w-4 h-4" />,
    });
    tabs.push({
      id: 'history',
      label: 'Audit Archive',
      icon: <History className="w-4 h-4" />,
    });
  }

  const handleNavigateToReport = (empId: string) => {
    setFocusedEmployeeId(empId);
    setActiveTab('maple_ai_reports');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Module Title & Tab Navigation */}
      <div className="glass-card p-4 lg:p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-maple-400 block mb-1">
              Performance, Review & Maple AI Executive Reporting Suite
            </span>
            <h1 className="text-xl font-semibold text-white tracking-normal">
              {isAdmin
                ? 'Executive Performance & Review Command Center'
                : isManager
                ? `${userPod?.name || 'Pod'} Lead Review & Evaluation Hub`
                : 'My Work Performance & Deliverables Workspace'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-medium">
              {isAdmin
                ? 'Organization Admin Scope'
                : isManager
                ? `${userPod?.name || 'Pod'} Lead Scope`
                : `${profile?.full_name} • ${userPod?.name || 'Pod'}`}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-maple-500/20 text-maple-300 border border-maple-500/40 shadow-glow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-maple-400' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tab Render */}
      <div className="min-h-[500px]">
        {activeTab === 'member_work' && <MemberWorkTab />}
        {activeTab === 'pod_review' && <PodLeadReviewTab />}
        {activeTab === 'manager_review' && (
          <ManagerReviewTab onGenerateReportForEmployee={handleNavigateToReport} />
        )}
        {activeTab === 'sprint_analytics' && (
          <SprintReviewAnalyticsCockpit
            onNavigateToExecutiveReport={handleNavigateToReport}
            onNavigateToWorkTable={() => setActiveTab('manager_review')}
          />
        )}
        {activeTab === 'leave_planner' && (
          <LeavePlannerPage onNavigate={() => {}} />
        )}
        {activeTab === 'maple_ai_reports' && (
          <MapleAIExecutiveConsole initialEmployeeId={focusedEmployeeId} />
        )}
        {activeTab === 'dashboard' && (
          <PerformanceDashboardTab
            onNavigateToReport={handleNavigateToReport}
            onNavigateToWorkData={() => setActiveTab('manager_review')}
          />
        )}
        {activeTab === 'kra_kpi' && <KraKpiTab />}
        {activeTab === 'history' && (
          <ReportHistoryTab onSelectReportToEdit={handleNavigateToReport} />
        )}
      </div>
    </div>
  );
};
