// ==============================================================================
// MapleBot: Executive Performance Dashboard Tab
// High-level KPI metrics, project distributions, and category breakdowns
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceService } from '../../../services/performanceService';
import { Button, GradientButton } from '../../../components/ui/Button';
import {
  Sparkles,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';

interface PerformanceDashboardTabProps {
  onNavigateToReport: (employeeId: string) => void;
  onNavigateToWorkData: () => void;
}

export const PerformanceDashboardTab: React.FC<PerformanceDashboardTabProps> = ({
  onNavigateToReport,
  onNavigateToWorkData,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const pods = dataStore.getPods();
  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  const [selectedPodId, setSelectedPodId] = useState<string>(isManager ? (profile?.pod_id || '') : '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('month');

  // Filter profiles based on selected pod
  const filteredProfiles = useMemo(() => {
    if (!selectedPodId) return availableProfiles;
    return availableProfiles.filter((p) => p.pod_id === selectedPodId || (p.pod_ids && p.pod_ids.includes(selectedPodId)));
  }, [availableProfiles, selectedPodId]);

  // Compute date range
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (dateRangePreset === 'month') {
      return { startDate: '2026-08-01', endDate: '2026-08-31', periodLabel: 'August 2026' };
    }
    if (dateRangePreset === 'last_month') {
      return { startDate: '2026-07-01', endDate: '2026-07-31', periodLabel: 'July 2026' };
    }
    if (dateRangePreset === 'q3') {
      return { startDate: '2026-07-01', endDate: '2026-09-30', periodLabel: 'Q3 2026' };
    }
    return { startDate: undefined, endDate: undefined, periodLabel: 'All Time' };
  }, [dateRangePreset]);

  // Retrieve work logs
  const logs = useMemo(() => {
    return performanceService.getAllWorkLogsForPeriod(
      selectedEmployeeId || undefined,
      selectedPodId || undefined,
      startDate,
      endDate
    );
  }, [selectedEmployeeId, selectedPodId, startDate, endDate]);

  // Deterministic metrics
  const snapshot = useMemo(() => performanceService.computeSnapshotMetrics(logs), [logs]);
  const projectBreakdown = useMemo(() => performanceService.computeProjectBreakdown(logs), [logs]);
  const categoryBreakdown = useMemo(() => performanceService.computeCategoryBreakdown(logs), [logs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. FILTER CONTROLS BAR */}
      <div className="glass-card p-4 lg:p-5 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="min-w-[160px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Department / Pod
              </label>
              <select
                value={selectedPodId}
                onChange={(e) => {
                  setSelectedPodId(e.target.value);
                  setSelectedEmployeeId('');
                }}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                <option value="">All Departments ({pods.length})</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="min-w-[180px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Employee Focus
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Team Members ({filteredProfiles.length})</option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Period
            </label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="month">August 2026 (Current)</option>
              <option value="last_month">July 2026</option>
              <option value="q3">Q3 2026</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={onNavigateToWorkData}>
            View Work Logs
          </Button>
          <GradientButton
            size="sm"
            onClick={() => onNavigateToReport(selectedEmployeeId || 'prof-harshika')}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Generate Executive Report
          </GradientButton>
        </div>
      </div>

      {/* 2. TOP KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-card p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {snapshot.completed_tasks}
            <span className="text-xs text-slate-500 font-normal"> / {snapshot.total_tasks}</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {snapshot.total_tasks - snapshot.completed_tasks} in progress / pending
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-maple-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {snapshot.completion_rate}%
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Delivery efficiency index
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Total Hours</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {snapshot.total_hours}h
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Productive work logged
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Projects</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {snapshot.projects_count}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Active product initiatives
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>High Priority</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {snapshot.high_priority_tasks}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Critical deliverables
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Pending / Blocked</span>
            <AlertTriangle className={`w-4 h-4 ${snapshot.blocked_tasks > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black ${snapshot.blocked_tasks > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {snapshot.pending_tasks + snapshot.blocked_tasks}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {snapshot.blocked_tasks} active blocker(s)
          </span>
        </div>
      </div>

      {/* 3. WORK BREAKDOWN BY PROJECT & CATEGORY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Breakdown Table */}
        <div className="glass-card p-6 border border-slate-800/90 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-maple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Project Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {projectBreakdown.length} Initiatives
            </span>
          </div>

          {projectBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No project work data recorded for this selection.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-3 px-4 font-semibold">Project</th>
                    <th className="py-3 px-4 font-semibold text-right">Tasks</th>
                    <th className="py-3 px-4 font-semibold text-right">Completed</th>
                    <th className="py-3 px-4 font-semibold text-right">Hours</th>
                    <th className="py-3 px-4 font-semibold text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {projectBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{row.project}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{row.total_tasks}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{row.completed_tasks}</td>
                      <td className="py-3 px-4 text-right font-mono text-sky-400">{row.total_hours}h</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-maple-400">{row.completion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category Breakdown Table */}
        <div className="glass-card p-6 border border-slate-800/90 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-maple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Category Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {categoryBreakdown.length} Categories
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No category work data recorded for this selection.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold text-right">Tasks</th>
                    <th className="py-3 px-4 font-semibold text-right">Hours</th>
                    <th className="py-3 px-4 font-semibold text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {categoryBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{row.category}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{row.total_tasks}</td>
                      <td className="py-3 px-4 text-right font-mono text-sky-400">{row.total_hours}h</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-maple-400">{row.completion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
