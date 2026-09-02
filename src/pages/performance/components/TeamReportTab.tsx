// ==============================================================================
// MapleBot: Team Performance Report Tab
// Multi-employee performance matrix, pod distributions & management attention items
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceService } from '../../../services/performanceService';
import { performanceExportService } from '../../../services/performanceExportService';
import { TeamExecutiveReportData } from '../../../types/performance';
import { Button, GradientButton } from '../../../components/ui/Button';
import {
  Users,
  Download,
  Printer,
  AlertTriangle,
  Clock,
  Eye,
  ShieldAlert,
} from 'lucide-react';

interface TeamReportTabProps {
  onSelectEmployeeForReport: (employeeId: string) => void;
}

export const TeamReportTab: React.FC<TeamReportTabProps> = ({
  onSelectEmployeeForReport,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const pods = dataStore.getPods();
  const defaultPodId = isManager ? (profile?.pod_id || 'pod-web-sales') : '';

  const [selectedPodId, setSelectedPodId] = useState<string>(defaultPodId);
  const [periodPreset, setPeriodPreset] = useState<'aug2026' | 'jul2026' | 'q32026'>('aug2026');

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodPreset === 'aug2026') {
      return { startDate: '2026-08-01', endDate: '2026-08-31', periodLabel: 'August 2026' };
    }
    if (periodPreset === 'jul2026') {
      return { startDate: '2026-07-01', endDate: '2026-07-31', periodLabel: 'July 2026' };
    }
    return { startDate: '2026-07-01', endDate: '2026-09-30', periodLabel: 'Q3 2026' };
  }, [periodPreset]);

  // Compute team executive data
  const teamData: TeamExecutiveReportData = useMemo(() => {
    return performanceService.generateTeamExecutiveData(
      selectedPodId || undefined,
      startDate,
      endDate,
      periodLabel
    );
  }, [selectedPodId, startDate, endDate, periodLabel]);

  const handleExportXLSX = () => {
    performanceExportService.exportTeamReportToXLSX(teamData);
  };

  const handlePrint = () => {
    performanceExportService.printReport();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 print:bg-white print:text-black">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="glass-card p-6 border border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:border-none print:p-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Team Performance Report
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-medium">{periodLabel}</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight print:text-black">
            {teamData.team_name}
          </h1>
          <p className="text-xs text-slate-400 print:text-slate-700">
            Multi-member performance matrix, initiative throughput, and operational attention items.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {isAdmin && (
            <select
              value={selectedPodId}
              onChange={(e) => setSelectedPodId(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Departments ({pods.length})</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
          >
            <option value="aug2026">August 2026</option>
            <option value="jul2026">July 2026</option>
            <option value="q32026">Q3 2026</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportXLSX}
            leftIcon={<Download className="w-4 h-4 text-maple-400" />}
          >
            Export Excel (.xlsx)
          </Button>

          <GradientButton
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / PDF
          </GradientButton>
        </div>
      </div>

      {/* 2. TEAM SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Team Members</span>
          <span className="text-2xl font-bold text-white">
            {teamData.team_summary.total_members}
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Tasks Completed</span>
          <span className="text-2xl font-bold text-white">
            {teamData.team_summary.completed_tasks}
            <span className="text-xs text-slate-500 font-normal"> / {teamData.team_summary.total_tasks}</span>
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Completion Rate</span>
          <span className="text-2xl font-bold text-emerald-400">
            {teamData.team_summary.completion_rate}%
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Total Hours</span>
          <span className="text-2xl font-bold text-sky-400">
            {teamData.team_summary.total_hours}h
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Active Projects</span>
          <span className="text-2xl font-bold text-purple-400">
            {teamData.team_summary.active_projects_count}
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Pending Tasks</span>
          <span className="text-2xl font-bold text-amber-400">
            {teamData.team_summary.pending_tasks}
          </span>
        </div>

        <div className="glass-card p-4 border border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">At-Risk Items</span>
          <span className={`text-2xl font-bold ${teamData.team_summary.at_risk_tasks > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {teamData.team_summary.at_risk_tasks}
          </span>
        </div>
      </div>

      {/* 3. MEMBER PERFORMANCE MATRIX TABLE */}
      <div className="glass-card p-6 border border-slate-800/90 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-maple-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Team Member Performance Matrix
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {teamData.members_summary.length} Team Members
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold text-right">Tasks</th>
                <th className="py-3 px-4 font-semibold text-right">Completed</th>
                <th className="py-3 px-4 font-semibold text-right">Hours Logged</th>
                <th className="py-3 px-4 font-semibold text-right">Completion %</th>
                <th className="py-3 px-4 font-semibold text-right">Projects</th>
                <th className="py-3 px-4 font-semibold text-center">Score</th>
                <th className="py-3 px-4 font-semibold text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {teamData.members_summary.map((member) => (
                <tr key={member.employee_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">
                    {member.employee_name}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {member.role}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    {member.total_tasks}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">
                    {member.completed_tasks}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sky-400 font-medium">
                    {member.total_hours}h
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-maple-400">
                    {member.completion_rate}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-purple-400 font-medium">
                    {member.projects_count}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    {member.performance_score !== null ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-maple-500/20 text-maple-300 border border-maple-500/30">
                        {member.performance_score} / 100
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] italic">No logs</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center print:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectEmployeeForReport(member.employee_id)}
                      leftIcon={<Eye className="w-3.5 h-3.5 text-maple-400" />}
                    >
                      View Report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MANAGEMENT ATTENTION & CRITICAL OPERATIONAL RADAR */}
      <div className="glass-card p-6 border border-slate-800/90 space-y-6">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Management Attention & Operational Radar
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delayed / High-Priority Pending */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              High-Priority Pending & Delayed Deliverables
            </h4>
            {teamData.management_attention.high_priority_pending.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No critical delayed tasks.</p>
            ) : (
              <div className="space-y-2">
                {teamData.management_attention.high_priority_pending.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/70 border border-amber-500/20 text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-white block">{item.task}</span>
                      <span className="text-[11px] text-slate-400">Assigned to: {item.employee}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 whitespace-nowrap">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repeated Blockers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Active Impediments & Blockers
            </h4>
            {teamData.management_attention.repeated_blockers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">🟢 No active blockers reported.</p>
            ) : (
              <div className="space-y-2">
                {teamData.management_attention.repeated_blockers.map((blk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/70 border border-rose-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{blk.blocker}</span>
                      <span className="text-[10px] font-bold text-rose-400 uppercase">{blk.impact}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">Reported by: {blk.affected_employee}</span>
                    <span className="text-[11px] text-slate-300 block">Action: {blk.suggested_resolution}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
