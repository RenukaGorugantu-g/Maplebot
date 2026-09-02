// ==============================================================================
// MapleBot: Maple AI Executive Reporting & Performance Intelligence Console
// Turns structured 17-column work data into corporate executive management reports
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceService } from '../../../services/performanceService';
import { performanceAIService } from '../../../services/performanceAIService';
import { performanceExportService } from '../../../services/performanceExportService';
import {
  ExecutiveReportData,
  TeamExecutiveReportData,
  PerformanceReport,
} from '../../../types/performance';
import { ExecutiveReportView } from './ExecutiveReportView';
import { Button, GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  Sparkles,
  Search,
  Download,
  Printer,
  Users,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Building,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface MapleAIExecutiveConsoleProps {
  initialEmployeeId?: string;
}

export const MapleAIExecutiveConsole: React.FC<MapleAIExecutiveConsoleProps> = ({
  initialEmployeeId,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const pods = dataStore.getPods();
  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  // Report Scope & Target
  const [reportScope, setReportScope] = useState<'individual' | 'pod' | 'executive'>('individual');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployeeId || (isManager && availableProfiles[0]?.id) || 'prof-harshika'
  );
  const [selectedPodId, setSelectedPodId] = useState<string>(isManager ? (profile?.pod_id || 'pod-web-sales') : 'pod-web-sales');
  const [periodPreset, setPeriodPreset] = useState<'aug2026' | 'jul2026' | 'q32026' | 'custom'>('aug2026');
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [periodLabel, setPeriodLabel] = useState<string>('August 2026');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeIndividualReport, setActiveIndividualReport] = useState<ExecutiveReportData | null>(null);
  const [activeTeamReport, setActiveTeamReport] = useState<TeamExecutiveReportData | null>(null);
  const [activeSavedReport, setActiveSavedReport] = useState<PerformanceReport | undefined>(undefined);
  const [naturalQuery, setNaturalQuery] = useState<string>('');

  const handlePeriodChange = (preset: 'aug2026' | 'jul2026' | 'q32026' | 'custom') => {
    setPeriodPreset(preset);
    if (preset === 'aug2026') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
      setPeriodLabel('August 2026');
    } else if (preset === 'jul2026') {
      setStartDate('2026-07-01');
      setEndDate('2026-07-31');
      setPeriodLabel('July 2026');
    } else if (preset === 'q32026') {
      setStartDate('2026-07-01');
      setEndDate('2026-09-30');
      setPeriodLabel('Q3 2026');
    }
  };

  // Generate Report
  const handleSynthesizeReport = async () => {
    setIsGenerating(true);
    try {
      if (reportScope === 'individual') {
        const data = await performanceAIService.generateIndividualReport({
          employeeId: selectedEmployeeId,
          periodStart: startDate,
          periodEnd: endDate,
          periodLabel,
          reportType: 'monthly',
        });
        setActiveIndividualReport(data);
        setActiveTeamReport(null);
      } else {
        const teamData = performanceService.generateTeamExecutiveData(
          reportScope === 'pod' ? selectedPodId : undefined,
          startDate,
          endDate,
          periodLabel
        );
        setActiveTeamReport(teamData);
        setActiveIndividualReport(null);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Pre-configured query prompt handler
  const handleRunSuggestedPrompt = (query: string, scope: 'individual' | 'pod' | 'executive', empId?: string, pod?: string) => {
    setNaturalQuery(query);
    setReportScope(scope);
    if (empId) setSelectedEmployeeId(empId);
    if (pod) setSelectedPodId(pod);

    setTimeout(() => {
      handleSynthesizeReport();
    }, 100);
  };

  // Initial load
  useEffect(() => {
    handleSynthesizeReport();
  }, [selectedEmployeeId, selectedPodId, periodPreset, reportScope]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. MAPLE AI BANNER & SCOPE CONTROLS */}
      <div className="glass-card p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-maple-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Maple AI — Performance Intelligence Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
              Executive Performance Reporting
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Converts verified multi-tier work logs into evidence-based executive reports with deterministic calculations.
            </p>
          </div>

          {/* Scope Selector */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setReportScope('individual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportScope === 'individual'
                  ? 'bg-maple-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Individual Report
            </button>
            <button
              onClick={() => setReportScope('pod')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportScope === 'pod'
                  ? 'bg-maple-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pod Department
            </button>
            {isAdmin && (
              <button
                onClick={() => setReportScope('executive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  reportScope === 'executive'
                    ? 'bg-maple-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Executive Org Overview
              </button>
            )}
          </div>
        </div>

        {/* Input Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
          {reportScope === 'individual' ? (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Select Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={!isAdmin && !isManager}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer disabled:opacity-70"
              >
                {availableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role} • {p.pod?.name || 'Pod'})
                  </option>
                ))}
              </select>
            </div>
          ) : reportScope === 'pod' ? (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Select Pod / Department
              </label>
              <select
                value={selectedPodId}
                onChange={(e) => setSelectedPodId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} Pod</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Organization Scope
              </label>
              <input
                type="text"
                value="Maple Learning Solutions (All Pods)"
                disabled
                className="w-full px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold cursor-not-allowed"
              />
            </div>
          )}

          {/* Period Preset */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Reporting Period
            </label>
            <select
              value={periodPreset}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="aug2026">August 2026 (Monthly)</option>
              <option value="jul2026">July 2026 (Monthly)</option>
              <option value="q32026">Q3 2026 (Quarterly)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Inputs if custom */}
          {periodPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs cursor-pointer"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs cursor-pointer"
              />
            </div>
          )}

          <div className="sm:col-span-1">
            <GradientButton
              size="md"
              onClick={handleSynthesizeReport}
              disabled={isGenerating}
              className="w-full justify-center"
              leftIcon={<Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />}
            >
              {isGenerating ? 'Synthesizing...' : 'Generate Report'}
            </GradientButton>
          </div>
        </div>

        {/* 2. SUGGESTED EXECUTIVE PROMPTS (SECTIONS 19 & 32) */}
        <div className="pt-2 border-t border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Executive Quick Queries:</span>
            <span>Click any prompt to instantly run AI synthesis</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRunSuggestedPrompt("Give me Renuka's August performance report.", 'individual', 'prof-renuka')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              "Give me Renuka's August report"
            </button>
            <button
              onClick={() => handleRunSuggestedPrompt("Give me Harshika's major contributions and delayed tasks.", 'individual', 'prof-harshika')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              "Harshika's contributions & delays"
            </button>
            <button
              onClick={() => handleRunSuggestedPrompt("Give me the Web & Sales Pod performance report for August.", 'pod', undefined, 'pod-web-sales')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              "Web & Sales Pod August report"
            </button>
            <button
              onClick={() => handleRunSuggestedPrompt("Give me the eLearning Pod performance report for August.", 'pod', undefined, 'pod-elearning')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              "eLearning Pod report"
            </button>
            {isAdmin && (
              <button
                onClick={() => handleRunSuggestedPrompt("Give me the organization executive performance summary for August.", 'executive')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                "Executive Org Summary for August"
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. REPORT RENDERER */}
      {isGenerating ? (
        <div className="glass-card p-16 text-center space-y-4 border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-maple-500/10 text-maple-400 border border-maple-500/30 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            Maple AI Synthesizing Corporate Performance Intelligence...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Computing programmatic turnaround times (TAT), review turnaround, delivery status delays, error rates, unit productivities, and evidence-based strengths.
          </p>
        </div>
      ) : activeIndividualReport ? (
        <ExecutiveReportView
          reportData={activeIndividualReport}
          savedReport={activeSavedReport}
          onSaveManagerReview={(updates) => {
            const reportId = `rep-${selectedEmployeeId}-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            const emp = dataStore.getProfileById(selectedEmployeeId);
            const saved = dataStore.savePerformanceReport({
              id: reportId,
              organization_id: emp?.organization_id || 'org-maple-01',
              employee_id: selectedEmployeeId,
              employee_name: emp?.full_name || 'Team Member',
              pod_id: emp?.pod_id,
              pod_name: emp?.pod?.name,
              report_type: 'monthly',
              period_start: startDate,
              period_end: endDate,
              period_label: periodLabel,
              report_data: activeIndividualReport,
              performance_score: activeIndividualReport.score_summary.total_score,
              status: updates.status || 'reviewed',
              ...updates,
              generated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setActiveSavedReport(saved);
          }}
          onRegenerate={handleSynthesizeReport}
        />
      ) : activeTeamReport ? (
        <div className="space-y-6">
          {/* Team Report Header */}
          <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-maple-400">
                Department Performance Report
              </span>
              <h2 className="text-2xl font-black text-white">{activeTeamReport.team_name}</h2>
              <span className="text-xs text-slate-400 font-medium">Reporting Period: {activeTeamReport.reporting_period}</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => performanceExportService.exportTeamReportToXLSX(activeTeamReport)}
                leftIcon={<Download className="w-4 h-4 text-maple-400" />}
              >
                Export Excel (.xlsx)
              </Button>
              <GradientButton
                size="sm"
                onClick={() => performanceExportService.printReport()}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print Report
              </GradientButton>
            </div>
          </div>

          {/* Team Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Team Members</span>
              <span className="text-2xl font-black text-white">{activeTeamReport.team_summary.total_members}</span>
            </div>
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Tasks Completed</span>
              <span className="text-2xl font-black text-white">{activeTeamReport.team_summary.completed_tasks} / {activeTeamReport.team_summary.total_tasks}</span>
            </div>
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Completion Rate</span>
              <span className="text-2xl font-black text-emerald-400">{activeTeamReport.team_summary.completion_rate}%</span>
            </div>
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Total Hours</span>
              <span className="text-2xl font-black text-sky-400">{activeTeamReport.team_summary.total_hours}h</span>
            </div>
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Total Units</span>
              <span className="text-2xl font-black text-purple-300">{activeTeamReport.team_summary.total_units}</span>
            </div>
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Average TAT</span>
              <span className="text-2xl font-black text-maple-400">{activeTeamReport.team_summary.average_tat}</span>
            </div>
            <div className="glass-card p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Delayed Items</span>
              <span className={`text-2xl font-black ${activeTeamReport.team_summary.delayed_tasks > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {activeTeamReport.team_summary.delayed_tasks}
              </span>
            </div>
          </div>

          {/* Member Matrix */}
          <div className="glass-card p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Member Performance Comparison Matrix</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Tasks</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Hours</th>
                    <th className="py-3 px-4 text-right">Units</th>
                    <th className="py-3 px-4 text-right">Completion %</th>
                    <th className="py-3 px-4 text-center">Quality</th>
                    <th className="py-3 px-4 text-center">TAT</th>
                    <th className="py-3 px-4 text-center">Efficiency</th>
                    <th className="py-3 px-4 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {activeTeamReport.members_summary.map((m) => (
                    <tr key={m.employee_id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold text-white">{m.employee_name}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{m.role}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{m.total_tasks}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{m.completed_tasks}</td>
                      <td className="py-3 px-4 text-right font-mono text-sky-400 font-bold">{m.total_hours}h</td>
                      <td className="py-3 px-4 text-right font-mono text-purple-300 font-bold">{m.total_units}</td>
                      <td className="py-3 px-4 text-right font-mono text-maple-400 font-bold">{m.completion_rate}%</td>
                      <td className="py-3 px-4 text-center">{typeof m.quality === 'number' ? `${m.quality}/5` : m.quality}</td>
                      <td className="py-3 px-4 text-center font-mono">{m.tat}</td>
                      <td className="py-3 px-4 text-center font-mono text-maple-400 font-bold">{m.efficiency}</td>
                      <td className="py-3 px-4 text-center">
                        {m.performance_score !== null ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-maple-500/20 text-maple-300 border border-maple-500/30">
                            {m.performance_score} / 100
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="Select criteria and generate report" description="Select an employee or pod and click Generate Report." />
      )}
    </div>
  );
};
