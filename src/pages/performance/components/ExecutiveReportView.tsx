// ==============================================================================
// MapleBot: Executive Performance Report Document View
// Corporate, evidence-based, executive-grade performance review layout
// ==============================================================================

import React, { useState } from 'react';
import {
  ExecutiveReportData,
  PerformanceReport,
  ReportStatus,
} from '../../../types/performance';
import { useAuth } from '../../../context/AuthContext';
import { performanceExportService } from '../../../services/performanceExportService';
import { Button, GradientButton } from '../../../components/ui/Button';
import {
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Target,
  Award,
  Layers,
  Sparkles,
  FileCheck,
  Building,
  Save,
  Star,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface ExecutiveReportViewProps {
  reportData: ExecutiveReportData;
  savedReport?: PerformanceReport;
  onSaveManagerReview?: (updatedReport: Partial<PerformanceReport>) => void;
  onRegenerate?: () => void;
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  reportData,
  savedReport,
  onSaveManagerReview,
  onRegenerate,
}) => {
  const { currentRole, profile } = useAuth();
  const isManagerOrAdmin = currentRole === 'admin' || currentRole === 'manager';

  // Manager Review local state
  const [managerRating, setManagerRating] = useState<number>(
    savedReport?.manager_rating || 4.5
  );
  const [managerComments, setManagerComments] = useState<string>(
    savedReport?.manager_comments || ''
  );
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>(
    savedReport?.status || 'reviewed'
  );
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  const handleSaveReview = () => {
    setIsSavingReview(true);
    try {
      if (onSaveManagerReview) {
        onSaveManagerReview({
          manager_rating: managerRating,
          manager_comments: managerComments,
          status: reviewStatus,
          reviewed_by: profile?.full_name || 'Manager',
          reviewed_at: new Date().toISOString(),
        });
      }
      setSaveSuccessMessage('Manager review successfully saved & updated!');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleExportXLSX = () => {
    performanceExportService.exportIndividualReportToXLSX(reportData);
  };

  const handlePrint = () => {
    performanceExportService.printReport();
  };

  const snapshot = reportData.snapshot;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto print:bg-white print:text-black">
      {/* 1. CORPORATE HEADER */}
      <div className="glass-card p-6 lg:p-8 border border-slate-800/90 space-y-6 print:border-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                MAPLE AI — PERFORMANCE REPORT
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-medium">{reportData.reporting_period}</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight print:text-black">
              {reportData.employee_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 print:text-slate-700">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-maple-400" />
                {reportData.employee_role}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-sky-400" />
                {reportData.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                Manager: <strong>{reportData.manager_name}</strong>
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {onRegenerate && (
              <Button variant="secondary" size="sm" onClick={onRegenerate}>
                Regenerate
              </Button>
            )}
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

        {/* 2. EXECUTIVE SUMMARY */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            Executive Summary
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed print:text-slate-800">
            {reportData.executive_summary.overview_text}
          </p>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">{reportData.executive_summary.velocity_assessment}</span>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-maple-500/20 text-maple-300 border border-maple-500/40">
              {reportData.executive_summary.overall_assessment}
            </span>
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE SNAPSHOT (KPI CARDS) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Performance Snapshot
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Tasks</span>
            <span className="text-xl font-bold text-white">{snapshot.total_tasks}</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Completed</span>
            <span className="text-xl font-bold text-white">{snapshot.completed_tasks}</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Completion</span>
            <span className="text-xl font-bold text-emerald-400">{snapshot.completion_rate}%</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Total Time</span>
            <span className="text-xl font-bold text-sky-400">{snapshot.total_hours}h</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Units</span>
            <span className="text-xl font-bold text-purple-300">{snapshot.units_completed}</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Errors</span>
            <span className="text-xl font-bold text-rose-300">{snapshot.errors_count}</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Quality</span>
            <span className="text-xl font-bold text-amber-300">
              {typeof snapshot.average_quality === 'number' ? `${snapshot.average_quality}/5` : 'Pending'}
            </span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Average TAT</span>
            <span className="text-xl font-bold text-maple-400">{snapshot.average_tat}</span>
          </div>
          <div className="glass-card p-3.5 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">Efficiency</span>
            <span className="text-xl font-bold text-emerald-400">{snapshot.efficiency}</span>
          </div>
        </div>
      </div>

      {/* 4. WORK PERFORMANCE BREAKDOWN BY PROJECT (SECTION 35) */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-maple-400" />
          Work Performance Breakdown
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4 text-right">Tasks</th>
                <th className="py-3 px-4 text-right">Completed</th>
                <th className="py-3 px-4 text-right">Units</th>
                <th className="py-3 px-4 text-right">Time</th>
                <th className="py-3 px-4 text-right">Errors</th>
                <th className="py-3 px-4 text-center">Quality</th>
                <th className="py-3 px-4 text-center">Avg TAT</th>
                <th className="py-3 px-4 text-center">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {reportData.project_performance.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="py-3 px-4 font-semibold text-white">{row.project}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">{row.tasks}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">{row.completed}</td>
                  <td className="py-3 px-4 text-right font-mono text-purple-300 font-bold">{row.units}</td>
                  <td className="py-3 px-4 text-right font-mono text-sky-400 font-bold">{row.time_hours}h</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-300 font-bold">{row.errors}</td>
                  <td className="py-3 px-4 text-center">{typeof row.quality === 'number' ? `${row.quality}/5` : row.quality}</td>
                  <td className="py-3 px-4 text-center font-mono">{row.avg_tat}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-maple-400">{row.efficiency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TIMELINESS & DELAYED WORK (SECTION 36 & 37) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Performance */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            Delivery Performance
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">On Time</span>
              <span className="text-lg font-bold text-emerald-400">{reportData.delivery_performance.completed_on_time}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Early</span>
              <span className="text-lg font-bold text-sky-400">{reportData.delivery_performance.completed_early}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Delayed</span>
              <span className={`text-lg font-bold ${reportData.delivery_performance.delayed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {reportData.delivery_performance.delayed}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Pending</span>
              <span className="text-lg font-bold text-amber-400">{reportData.delivery_performance.pending}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300">{reportData.delivery_performance.summary_text}</p>
        </div>

        {/* Quality Performance (Section 38) */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            Quality Performance
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Avg Quality</span>
              <span className="text-lg font-bold text-amber-400">
                {typeof reportData.quality_performance.average_quality === 'number' ? `${reportData.quality_performance.average_quality}/5` : 'Pending'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Errors</span>
              <span className="text-lg font-bold text-rose-400">{reportData.quality_performance.total_errors}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Error Rate</span>
              <span className="text-lg font-bold text-purple-300">{reportData.quality_performance.error_rate_percent}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Error-Free</span>
              <span className="text-lg font-bold text-emerald-400">{reportData.quality_performance.error_free_tasks}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300">{reportData.quality_performance.interpretation}</p>
        </div>
      </div>

      {/* Delayed Tasks Table (Section 37) */}
      {reportData.delayed_tasks.length > 0 && (
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Delayed Work Audit & Root Cause
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Expected</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4 text-center">Delay</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {reportData.delayed_tasks.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-semibold text-white">{d.task}</td>
                    <td className="py-3 px-4 text-slate-300">{d.project}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{d.expected_date}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{d.completed_date}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-400">{d.delay_label}</td>
                    <td className="py-3 px-4 text-slate-300 italic text-[11px]">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. UNIT PRODUCTIVITY & REVIEW PERFORMANCE (SECTIONS 39 & 40) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Productivity */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Unit Productivity (Units / Hour)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4 text-right">Units</th>
                  <th className="py-3 px-4 text-right">Hours</th>
                  <th className="py-3 px-4 text-right">Units / Hour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {reportData.unit_productivity.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-semibold text-white">{p.project}</td>
                    <td className="py-3 px-4 text-right font-mono text-purple-300 font-bold">{p.units}</td>
                    <td className="py-3 px-4 text-right font-mono text-sky-400 font-bold">{p.hours}h</td>
                    <td className="py-3 px-4 text-right font-mono text-maple-400 font-bold">{p.units_per_hour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Performance */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-maple-400" />
            Review Verification Performance
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Assigned</span>
              <span className="text-lg font-bold text-white">{reportData.review_performance.reviews_assigned}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Completed</span>
              <span className="text-lg font-bold text-emerald-400">{reportData.review_performance.reviews_completed}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Pending</span>
              <span className="text-lg font-bold text-amber-400">{reportData.review_performance.pending_reviews}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Avg TAT</span>
              <span className="text-lg font-bold text-sky-400">{reportData.review_performance.average_review_tat}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            Review turnaround averaged {reportData.review_performance.average_review_tat} across {reportData.review_performance.reviews_completed} verified deliverables.
          </p>
        </div>
      </div>

      {/* 7. KEY CONTRIBUTIONS & ACTIVITY-TO-IMPACT (SECTIONS 41 & 9) */}
      <div className="glass-card p-6 border border-slate-800 space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-2">
          <Award className="w-4 h-4" />
          Key Contributions Grouped by Project
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportData.key_contributions.map((c, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-bold text-white text-sm block">{c.project}</span>
              <p className="text-xs text-slate-400">{c.summary}</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {c.highlights.map((h, hIdx) => (
                  <li key={hIdx} className="flex items-start gap-1.5">
                    <span className="text-maple-400 font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 8. DEMONSTRATED STRENGTHS & AREAS REQUIRING ATTENTION (SECTIONS 42 & 43) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Demonstrated Strengths (Evidence-Based)
          </h3>
          <div className="space-y-3">
            {reportData.demonstrated_strengths.map((s, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-emerald-500/20 space-y-1 text-xs">
                <span className="font-bold text-white block">{s.title}</span>
                <span className="text-[11px] text-slate-300 block">{s.evidence}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas Requiring Attention */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Areas Requiring Attention
          </h3>
          <div className="space-y-3">
            {reportData.areas_requiring_attention.map((a, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-amber-500/20 space-y-1 text-xs">
                <span className="font-bold text-white block">{a.area}: {a.finding}</span>
                <span className="text-[11px] text-slate-400 block">Evidence: {a.evidence}</span>
                <span className="text-[11px] text-slate-300 block font-medium">Action: {a.recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 9. DATA TRANSPARENCY PROTOCOL (FACT, INSIGHT, DATA GAP - SECTION 45) */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-maple-400" />
          Data Transparency Protocol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Facts */}
          <div className="p-4 rounded-xl bg-slate-900 border border-sky-500/20 space-y-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Verified Facts
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {reportData.transparency.facts.map((f, idx) => (
                <li key={idx}>• {f}</li>
              ))}
            </ul>
          </div>

          {/* Insights */}
          <div className="p-4 rounded-xl bg-slate-900 border border-maple-500/20 space-y-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-maple-500/20 text-maple-300 border border-maple-500/30">
              AI Insights
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {reportData.transparency.insights.map((ins, idx) => (
                <li key={idx}>• {ins}</li>
              ))}
            </ul>
          </div>

          {/* Data Gaps */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/50 space-y-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
              Data Gaps
            </span>
            <ul className="space-y-1 text-[11px] text-slate-400 italic">
              {reportData.transparency.data_gaps.map((g, idx) => (
                <li key={idx}>• {g}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 10. EXECUTIVE RECOMMENDATION & MANAGER SIGN-OFF (SECTIONS 44 & 9) */}
      <div className="glass-card p-6 lg:p-8 border border-slate-800 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Executive Recommendation
          </h3>
          <blockquote className="text-sm text-slate-200 border-l-2 border-maple-400 pl-4 py-1 italic leading-relaxed">
            "{reportData.executive_recommendation.management_conclusion}"
          </blockquote>
          <p className="text-xs text-slate-400 pt-1">
            <strong>Next Cycle Focus:</strong> {reportData.executive_recommendation.next_cycle_focus}
          </p>
        </div>

        {/* Interactive Manager Review Section */}
        {isManagerOrAdmin && (
          <div className="border-t border-slate-800 pt-6 space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Manager Appraisal Sign-off
              </h4>
              {saveSuccessMessage && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saveSuccessMessage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Overall Performance Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={managerRating}
                    onChange={(e) => setManagerRating(parseFloat(e.target.value))}
                    className="w-full accent-maple-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-maple-400 font-mono whitespace-nowrap min-w-[50px]">
                    {managerRating} / 5.0
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Review Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as ReportStatus)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs"
                >
                  <option value="draft">Draft (In Review)</option>
                  <option value="reviewed">Reviewed (Signed Off by Lead)</option>
                  <option value="approved">Approved (Executive Finalized)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Manager Comments & Feedback</label>
              <textarea
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                placeholder="Enter executive feedback, strengths observed, and next cycle goals..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
              />
            </div>

            <div className="flex justify-end">
              <GradientButton
                size="sm"
                onClick={handleSaveReview}
                disabled={isSavingReview}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSavingReview ? 'Saving...' : 'Save & Sign Off Appraisal'}
              </GradientButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
