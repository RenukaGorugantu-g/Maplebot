// ==============================================================================
// MapleBot: Individual Performance Report Tab
// Interactive report generation & full executive corporate document review
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceAIService } from '../../../services/performanceAIService';
import { ExecutiveReportView } from './ExecutiveReportView';
import {
  ExecutiveReportData,
  PerformanceReport,
  ReportType,
} from '../../../types/performance';
import { GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface IndividualReportTabProps {
  initialEmployeeId?: string;
}

export const IndividualReportTab: React.FC<IndividualReportTabProps> = ({
  initialEmployeeId,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployeeId || (isManager && availableProfiles[0]?.id) || 'prof-harshika'
  );
  const [periodPreset, setPeriodPreset] = useState<'aug2026' | 'jul2026' | 'q32026' | 'custom'>('aug2026');
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [periodLabel, setPeriodLabel] = useState<string>('August 2026');
  const [reportType, setReportType] = useState<ReportType>('monthly');

  const [activeReportData, setActiveReportData] = useState<ExecutiveReportData | null>(null);
  const [activeSavedReport, setActiveSavedReport] = useState<PerformanceReport | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle Preset Changes
  const handlePresetChange = (preset: 'aug2026' | 'jul2026' | 'q32026' | 'custom') => {
    setPeriodPreset(preset);
    if (preset === 'aug2026') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
      setPeriodLabel('August 2026');
      setReportType('monthly');
    } else if (preset === 'jul2026') {
      setStartDate('2026-07-01');
      setEndDate('2026-07-31');
      setPeriodLabel('July 2026');
      setReportType('monthly');
    } else if (preset === 'q32026') {
      setStartDate('2026-07-01');
      setEndDate('2026-09-30');
      setPeriodLabel('Q3 2026');
      setReportType('quarterly');
    }
  };

  // Generate or fetch report
  const handleGenerateReport = async (empId = selectedEmployeeId) => {
    if (!empId) return;
    setIsGenerating(true);
    setErrorMessage('');

    try {
      // First check if an archived report exists for this employee and period
      const existingReports = dataStore.getPerformanceReports({
        employeeId: empId,
        reportType,
      });

      const matchedReport = existingReports.find(
        (r) => r.period_start === startDate && r.period_end === endDate
      );

      if (matchedReport) {
        setActiveSavedReport(matchedReport);
        setActiveReportData(matchedReport.report_data);
      } else {
        const freshData = await performanceAIService.generateIndividualReport({
          employeeId: empId,
          periodStart: startDate,
          periodEnd: endDate,
          periodLabel,
          reportType,
        });
        setActiveReportData(freshData);
        setActiveSavedReport(undefined);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize report.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleGenerateReport(selectedEmployeeId);
  }, [selectedEmployeeId, periodPreset]);

  const handleSaveManagerReview = (updatedReview: Partial<PerformanceReport>) => {
    if (!activeReportData) return;

    const reportId = activeSavedReport?.id || `rep-${selectedEmployeeId.replace(/^prof-/, '')}-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    const emp = dataStore.getProfileById(selectedEmployeeId);
    const pod = emp?.pod_id ? dataStore.getPodById(emp.pod_id) : undefined;

    const toSave: PerformanceReport = {
      id: reportId,
      organization_id: emp?.organization_id || 'org-maple-01',
      employee_id: selectedEmployeeId,
      employee_name: emp?.full_name || 'Team Member',
      pod_id: emp?.pod_id,
      pod_name: pod?.name,
      report_type: reportType,
      period_start: startDate,
      period_end: endDate,
      period_label: periodLabel,
      report_data: activeReportData,
      performance_score: activeReportData.score_summary.total_score,
      status: updatedReview.status || 'reviewed',
      ...updatedReview,
      generated_at: activeSavedReport?.generated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = dataStore.savePerformanceReport(toSave);
    setActiveSavedReport(saved);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. REPORT GENERATOR INPUT BAR */}
      <div className="glass-card p-5 border border-slate-800/90 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Employee Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Employee Focus *
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

            {/* Reporting Period */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Period Preset
              </label>
              <select
                value={periodPreset}
                onChange={(e) => handlePresetChange(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                <option value="aug2026">August 2026 (Monthly)</option>
                <option value="jul2026">July 2026 (Monthly)</option>
                <option value="q32026">Q3 2026 (Quarterly)</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Review Type */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Review Format
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                <option value="monthly">Monthly Performance Review</option>
                <option value="quarterly">Quarterly Review</option>
                <option value="individual">Individual Appraisal</option>
                <option value="kra_kpi">KRA / KPI Audit</option>
                <option value="project">Project Review</option>
              </select>
            </div>
          </div>

          <div className="flex items-end pb-0.5">
            <GradientButton
              size="md"
              onClick={() => handleGenerateReport()}
              disabled={isGenerating}
              leftIcon={<Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />}
            >
              {isGenerating ? 'Synthesizing...' : 'Generate Report'}
            </GradientButton>
          </div>
        </div>

        {periodPreset === 'custom' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/60 animate-in fade-in text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs cursor-pointer"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs cursor-pointer"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Custom Label</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="e.g. Sprint 56 Audit"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* 2. RENDER THE GENERATED EXECUTIVE REPORT */}
      {isGenerating ? (
        <div className="glass-card p-16 text-center space-y-4 border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-maple-500/10 text-maple-400 border border-maple-500/30 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            Synthesizing Executive Performance Report...
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Computing task completion vectors, KPI actuals, activity-to-impact matrices, and evidence strengths.
          </p>
        </div>
      ) : activeReportData ? (
        <ExecutiveReportView
          reportData={activeReportData}
          savedReport={activeSavedReport}
          onSaveManagerReview={handleSaveManagerReview}
          onRegenerate={() => handleGenerateReport()}
        />
      ) : (
        <div className="glass-card p-12 text-center">
          <EmptyState
            title="No Report Generated"
            description="Select an employee and period above, then click Generate Report."
          />
        </div>
      )}
    </div>
  );
};
