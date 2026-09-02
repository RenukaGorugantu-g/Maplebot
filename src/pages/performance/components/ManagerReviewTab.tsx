// ==============================================================================
// MapleBot: Executive-Grade Manager Performance Review & 17-Column Ledger
// Full Evaluation of All 3 Manager Fields: Quality, TAT, Efficiency + Professional SaaS UI
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceService } from '../../../services/performanceService';
import { performanceExportService } from '../../../services/performanceExportService';
import {
  PerformanceWorkLog,
  QualityRating,
} from '../../../types/performance';
import { Modal } from '../../../components/ui/Modal';
import { Button, GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  Calculator,
  ShieldCheck,
  Award,
  Calendar,
  User,
  HelpCircle,
} from 'lucide-react';

interface ManagerReviewTabProps {
  onGenerateReportForEmployee?: (employeeId: string) => void;
}

export const ManagerReviewTab: React.FC<ManagerReviewTabProps> = ({
  onGenerateReportForEmployee,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const pods = dataStore.getPods();
  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  // Multi-Filter States
  const [selectedPodId, setSelectedPodId] = useState<string>(isManager ? (profile?.pod_id || '') : '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCompletionStatus, setSelectedCompletionStatus] = useState<string>('');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assessment Modal State: 3 Fields (Quality, TAT, Efficiency) + Notes
  const [assessingLog, setAssessingLog] = useState<PerformanceWorkLog | null>(null);
  const [qualityRating, setQualityRating] = useState<QualityRating>('Excellent');
  const [tatInput, setTatInput] = useState<string>('3 days');
  const [efficiencyInput, setEfficiencyInput] = useState<string>('95%');
  const [managerNotes, setManagerNotes] = useState<string>('');
  const [isSavingAssessment, setIsSavingAssessment] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string>('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortKey, setSortKey] = useState<keyof PerformanceWorkLog>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter profiles based on selected pod
  const filteredProfiles = useMemo(() => {
    if (!selectedPodId) return availableProfiles;
    return availableProfiles.filter((p) => p.pod_id === selectedPodId || (p.pod_ids && p.pod_ids.includes(selectedPodId)));
  }, [availableProfiles, selectedPodId]);

  // Retrieve enriched logs
  const allLogs = useMemo(() => {
    return performanceService.getAllWorkLogsForPeriod(
      selectedEmployeeId || undefined,
      selectedPodId || undefined,
      startDate || undefined,
      endDate || undefined
    );
  }, [selectedEmployeeId, selectedPodId, startDate, endDate, assessingLog, isSavingAssessment]);

  // Distinct projects
  const distinctProjects = useMemo(() => {
    const s = new Set<string>();
    allLogs.forEach((l) => {
      const p = l.project_name || l.project;
      if (p) s.add(p);
    });
    return Array.from(s).sort();
  }, [allLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      if (selectedProject && (l.project_name || l.project) !== selectedProject) return false;
      if (selectedCompletionStatus && l.delivery_status !== selectedCompletionStatus) return false;
      if (selectedReviewStatus && l.workflow_status !== selectedReviewStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (l.task && l.task.toLowerCase().includes(q)) ||
          (l.employee_name && l.employee_name.toLowerCase().includes(q)) ||
          (l.project_name && l.project_name.toLowerCase().includes(q)) ||
          (l.reviewer && l.reviewer.toLowerCase().includes(q)) ||
          (l.comments && l.comments.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [allLogs, selectedProject, selectedCompletionStatus, selectedReviewStatus, searchQuery]);

  // Sort
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      return sortOrder === 'asc' ? 1 : -1;
    });
  }, [filteredLogs, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLogs.slice(start, start + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  const handleSort = (key: keyof PerformanceWorkLog) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Open Assessment Modal for 3 Manager Fields
  const openAssessmentModal = (log: PerformanceWorkLog) => {
    setAssessingLog(log);

    // 1. Quality
    if (typeof log.quality === 'string' && ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Poor'].includes(log.quality)) {
      setQualityRating(log.quality as QualityRating);
    } else if (typeof log.quality === 'number') {
      if (log.quality >= 4.5) setQualityRating('Excellent');
      else if (log.quality >= 3.5) setQualityRating('Good');
      else if (log.quality >= 2.5) setQualityRating('Satisfactory');
      else if (log.quality >= 1.5) setQualityRating('Needs Improvement');
      else setQualityRating('Poor');
    } else {
      setQualityRating('Excellent');
    }

    // 2. TAT (Auto-compute or existing)
    if (log.tat && log.tat !== 'Not Available') {
      setTatInput(log.tat);
    } else {
      const start = new Date(log.assigned_date || log.date);
      const end = log.completed_date ? new Date(log.completed_date) : new Date();
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        setTatInput(`${days} day${days === 1 ? '' : 's'}`);
      } else {
        setTatInput('3 days');
      }
    }

    // 3. Efficiency (Auto-compute or existing)
    if (log.efficiency && log.efficiency !== 'Not Available') {
      setEfficiencyInput(String(log.efficiency));
    } else {
      const qVal = 5.0;
      const onTimeFactor = log.delivery_status === 'completed_early' || log.delivery_status === 'completed_on_time' ? 1 : 0.7;
      const qFactor = qVal / 5.0;
      const errFactor = log.unit_count_completed > 0 ? Math.max(0, 1 - (log.error_count || 0) / log.unit_count_completed) : 1;
      const effScore = Math.round((0.4 * onTimeFactor + 0.35 * qFactor + 0.25 * errFactor) * 100);
      setEfficiencyInput(`${effScore}%`);
    }

    setManagerNotes('');
  };

  // Recompute TAT on demand
  const handleAutoComputeTAT = () => {
    if (!assessingLog) return;
    const start = new Date(assessingLog.assigned_date || assessingLog.date);
    const end = assessingLog.completed_date ? new Date(assessingLog.completed_date) : new Date();
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      setTatInput(`${days} day${days === 1 ? '' : 's'}`);
    }
  };

  // Recompute Efficiency on demand
  const handleAutoComputeEfficiency = () => {
    if (!assessingLog) return;
    let qVal = 5.0;
    if (qualityRating === 'Excellent') qVal = 5.0;
    else if (qualityRating === 'Good') qVal = 4.0;
    else if (qualityRating === 'Satisfactory') qVal = 3.0;
    else if (qualityRating === 'Needs Improvement') qVal = 2.0;
    else if (qualityRating === 'Poor') qVal = 1.0;

    const onTimeFactor = assessingLog.delivery_status === 'completed_early' || assessingLog.delivery_status === 'completed_on_time' ? 1 : 0.7;
    const qFactor = qVal / 5.0;
    const errFactor = assessingLog.unit_count_completed > 0 ? Math.max(0, 1 - (assessingLog.error_count || 0) / assessingLog.unit_count_completed) : 1;
    const effScore = Math.round((0.4 * onTimeFactor + 0.35 * qFactor + 0.25 * errFactor) * 100);
    setEfficiencyInput(`${effScore}%`);
  };

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessingLog) return;

    setIsSavingAssessment(true);
    try {
      dataStore.saveManagerPerformance(assessingLog.id, {
        quality: qualityRating,
        tat: tatInput.trim() || '3 days',
        efficiency: efficiencyInput.includes('%') ? efficiencyInput.trim() : `${efficiencyInput.trim()}%`,
        manager_comments: managerNotes.trim() || undefined,
        manager_id: profile?.id,
      });

      setSuccessNotice(`Performance assessment saved for ${assessingLog.employee_name}: Quality ${qualityRating}, TAT ${tatInput}, Efficiency ${efficiencyInput}`);
      setTimeout(() => setSuccessNotice(''), 4000);
      setAssessingLog(null);
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleExportXLSX = () => {
    performanceExportService.exportStructuredWorkLogsToXLSX(filteredLogs);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & EXPORT ACTIONS */}
      <div className="glass-card p-6 border border-slate-800 bg-[#081426]/95 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-maple-400 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Executive Performance Governance Ledger
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white tracking-normal">
            Consolidated Work Performance Table (All 17 Columns)
          </h2>
          <p className="text-xs text-slate-400">
            Single record capturing Pod Member Deliverables (9 fields), Pod Lead Verification (5 fields), and Manager Evaluation (3 fields: Quality, TAT & Efficiency).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportXLSX}
            leftIcon={<Download className="w-4 h-4 text-maple-400" />}
          >
            Export Complete Excel (.xlsx)
          </Button>

          {onGenerateReportForEmployee && (
            <GradientButton
              size="sm"
              onClick={() => onGenerateReportForEmployee(selectedEmployeeId || 'prof-sample-member')}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Synthesize Executive Report
            </GradientButton>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* 2. ADVANCED FILTER BAR */}
      <div className="glass-card p-5 border border-slate-800 space-y-4 bg-[#081426]/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by task, member name, project, reviewer, comments..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
            />
          </div>
          <div className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredLogs.length}</strong> matching records
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {isAdmin && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Department / Pod
              </label>
              <select
                value={selectedPodId}
                onChange={(e) => {
                  setSelectedPodId(e.target.value);
                  setSelectedEmployeeId('');
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                <option value="">All Pods ({pods.length})</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Employees ({filteredProfiles.length})</option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Projects ({distinctProjects.length})</option>
              {distinctProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Delivery Timeliness
            </label>
            <select
              value={selectedCompletionStatus}
              onChange={(e) => {
                setSelectedCompletionStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Timeliness</option>
              <option value="completed_on_time">Completed On Time</option>
              <option value="completed_early">Completed Early</option>
              <option value="delayed">Delayed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Review Status
            </label>
            <select
              value={selectedReviewStatus}
              onChange={(e) => {
                setSelectedReviewStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted (Needs Lead Review)</option>
              <option value="pod_lead_reviewed">Pod Lead Reviewed</option>
              <option value="manager_reviewed">Manager Evaluated</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Filter Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. THE 17-COLUMN CONSOLIDATED TABLE WITH PROFESSIONAL VISUAL SECTIONS */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#060E1A] shadow-2xl">
        {sortedLogs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No records matching filter criteria"
              description="Adjust the filters or search bar above to view performance logs."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Grouped Section Header */}
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-800">
                  <th colSpan={7} className="py-2.5 px-3.5 text-slate-300 bg-[#071324] border-r border-slate-800">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      1. Work Information (Pod Member)
                    </span>
                  </th>
                  <th colSpan={5} className="py-2.5 px-3.5 text-sky-300 bg-[#071f38] border-r border-slate-800">
                    <span className="flex items-center gap-1.5 text-sky-300">
                      <Clock className="w-3.5 h-3.5" />
                      2. Pod Lead Review Verification
                    </span>
                  </th>
                  <th colSpan={3} className="py-2.5 px-3.5 text-maple-300 bg-[#062820] border-r border-slate-800">
                    <span className="flex items-center gap-1.5 text-maple-300">
                      <Star className="w-3.5 h-3.5" />
                      3. Manager Performance & Evaluation
                    </span>
                  </th>
                  <th colSpan={2} className="py-2.5 px-3.5 text-slate-400 text-center bg-[#071324]">
                    Action
                  </th>
                </tr>

                {/* Column Headers */}
                <tr className="bg-[#0B1728] border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <th onClick={() => handleSort('date')} className="py-3.5 px-3.5 cursor-pointer hover:text-white whitespace-nowrap">
                    Date & Check-in Time
                  </th>
                  <th onClick={() => handleSort('employee_name')} className="py-3.5 px-3.5 cursor-pointer hover:text-white whitespace-nowrap">
                    Teammate
                  </th>
                  <th onClick={() => handleSort('project_name')} className="py-3.5 px-3.5 cursor-pointer hover:text-white whitespace-nowrap">
                    Project
                  </th>
                  <th className="py-3.5 px-3.5 min-w-[240px]">Task Deliverable</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Assigned Date</th>
                  <th className="py-3.5 px-3.5 text-left whitespace-nowrap">Hours</th>
                  <th className="py-3.5 px-3.5 text-left whitespace-nowrap border-r border-slate-800">Deliverables</th>

                  {/* Pod Lead Review */}
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-sky-300">Expected Date</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-sky-300">Completed Date</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-sky-300">Review Done</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-sky-300">Reviewer</th>
                  <th className="py-3.5 px-3.5 text-left whitespace-nowrap text-sky-300 border-r border-slate-800">Errors</th>

                  {/* Manager Performance (3 Fields) */}
                  <th className="py-3.5 px-3.5 text-center whitespace-nowrap text-maple-300 font-semibold bg-maple-950/20">
                    Quality
                  </th>
                  <th className="py-3.5 px-3.5 text-center whitespace-nowrap text-maple-300 font-semibold bg-maple-950/20">
                    TAT
                  </th>
                  <th className="py-3.5 px-3.5 text-center whitespace-nowrap text-maple-300 font-semibold bg-maple-950/20 border-r border-slate-800">
                    Efficiency
                  </th>

                  {/* Comments & Action */}
                  <th className="py-3.5 px-3.5 min-w-[180px]">Comments</th>
                  <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-slate-200 text-sm">
                {paginatedLogs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* 1. Work Info (Pod Member) */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap align-top">
                      <span className="font-mono text-xs text-white block font-bold">{row.date}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mt-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {row.submission_time || row.checkin_time || '10:00 AM'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 font-bold text-white whitespace-nowrap align-top text-sm">
                      {row.employee_name}
                    </td>
                    <td className="py-3.5 px-3.5 font-bold text-slate-200 whitespace-nowrap align-top text-sm">
                      {row.project_name || row.project}
                    </td>
                    <td className="py-3.5 px-3.5 align-top">
                      <span className="font-medium text-slate-100 block text-sm leading-relaxed">{row.task || row.task_title}</span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-slate-300 whitespace-nowrap align-top">
                      {row.assigned_date}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono text-sky-400 font-bold whitespace-nowrap align-top text-sm">
                      {row.time_invested || row.duration_hours}h
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono text-purple-300 font-bold whitespace-nowrap align-top border-r border-slate-800/80 text-sm">
                      {row.unit_count_completed || 1} items
                    </td>

                    {/* 2. Pod Lead Review Verification */}
                    <td className="py-3.5 px-3.5 font-mono text-xs whitespace-nowrap align-top">
                      {row.expected_completion_date || <span className="text-slate-500 italic">—</span>}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs whitespace-nowrap align-top">
                      {row.completed_date ? (
                        <span className="text-slate-300">{row.completed_date}</span>
                      ) : (
                        <span className="text-amber-400 font-semibold italic">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] whitespace-nowrap align-top">
                      {row.review_completed_date || <span className="text-slate-500 italic">—</span>}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap align-top text-[11px]">
                      {row.reviewer || row.reviewer_name || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-rose-300 font-bold whitespace-nowrap align-top border-r border-slate-800/80">
                      {row.error_count ?? 0}
                    </td>

                    {/* 3. Manager Performance & Evaluation (All 3 Fields) */}
                    {/* Quality */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap align-top bg-maple-950/10">
                      {row.quality !== undefined && row.quality !== null ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {typeof row.quality === 'number' ? `${row.quality}/5` : row.quality}
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px] font-bold italic">Needs Assessment</span>
                      )}
                    </td>

                    {/* TAT */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-sky-300 whitespace-nowrap align-top bg-maple-950/10">
                      {row.tat || 'N/A'}
                    </td>

                    {/* Efficiency */}
                    <td className="py-3.5 px-3 text-center font-mono font-extrabold text-maple-400 whitespace-nowrap align-top bg-maple-950/10 border-r border-slate-800/80">
                      {row.efficiency || 'N/A'}
                    </td>

                    {/* Comments & Actions */}
                    <td className="py-3.5 px-3 text-slate-400 text-[11px] align-top">
                      {row.comments || <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssessmentModal(row)}
                        leftIcon={<Star className="w-3.5 h-3.5 text-maple-400" />}
                      >
                        Evaluate (3 Fields)
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0B1728]/50 text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedLogs.length)} of {sortedLogs.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-700 disabled:opacity-30 hover:bg-slate-800 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-700 disabled:opacity-30 hover:bg-slate-800 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MANAGER EVALUATION MODAL: WIDE 2-COLUMN WORKSTATION (QUALITY, TAT, EFFICIENCY) */}
      {assessingLog && (
        <Modal
          isOpen={!!assessingLog}
          onClose={() => setAssessingLog(null)}
          title={`Manager Performance Assessment — ${assessingLog.employee_name}`}
          subtitle="Evaluate deliverables quality, verify turnaround time (TAT), and review efficiency metrics."
          maxWidth="4xl"
        >
          <form onSubmit={handleSaveAssessment} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN (5 Cols): Complete Task & Member Context */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#060E1A] border border-slate-800 space-y-4 shadow-inner">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                      Task Deliverable
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {assessingLog.task || assessingLog.task_title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Employee</span>
                      <span className="text-white font-bold">{assessingLog.employee_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Project</span>
                      <span className="text-slate-200 font-semibold">{assessingLog.project_name || assessingLog.project}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Date & Check-in Time</span>
                      <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {assessingLog.submission_time || assessingLog.checkin_time || '10:00 AM'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Completed Date</span>
                      <span className="text-slate-300 font-mono">{assessingLog.completed_date || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Time Invested</span>
                      <span className="text-sky-400 font-mono font-bold text-sm">{assessingLog.time_invested} hrs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Deliverables Count</span>
                      <span className="text-purple-300 font-mono font-bold text-sm">{assessingLog.unit_count_completed || 1} items</span>
                    </div>
                  </div>

                  {/* Pod Lead Review Status */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider block">
                      Pod Lead Verification
                    </span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Reviewer:</span>
                      <span className="text-slate-200 font-semibold">{assessingLog.reviewer || 'Renuka Gorugantu'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Errors Identified:</span>
                      <span className={`font-mono font-bold ${assessingLog.error_count ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {assessingLog.error_count ?? 0} errors
                      </span>
                    </div>
                  </div>

                  {assessingLog.comments && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Member Notes</span>
                      <p className="text-slate-300 text-[11px] italic mt-0.5">{assessingLog.comments}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN (7 Cols): Manager Evaluation Workspace */}
              <div className="lg:col-span-7 space-y-5">
                <div className="p-5 rounded-2xl bg-maple-500/10 border border-maple-500/30 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
                      <Star className="w-4 h-4" />
                      Manager Performance Evaluation
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-maple-500/20 text-maple-300 font-bold">
                      3 Fields
                    </span>
                  </div>

                  {/* Field 1: Quality Rating */}
                  <div className="space-y-1.5">
                    <label className="text-slate-200 font-bold block text-xs">
                      1. Quality Rating (5-Level Standardized Scale) *
                    </label>
                    <select
                      value={qualityRating}
                      onChange={(e) => {
                        setQualityRating(e.target.value as QualityRating);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs font-bold"
                    >
                      <option value="Excellent">5 — Excellent (Flawless deliverable, zero rework required)</option>
                      <option value="Good">4 — Good (High quality, minimal minor corrections)</option>
                      <option value="Satisfactory">3 — Satisfactory (Meets standard requirements)</option>
                      <option value="Needs Improvement">2 — Needs Improvement (Noticeable defects / errors)</option>
                      <option value="Poor">1 — Poor (Unacceptable quality, major rework needed)</option>
                    </select>
                  </div>

                  {/* Field 2 & Field 3: TAT and Efficiency (Side by side) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Field 2: TAT */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-200 font-bold text-[11px]">
                          2. Turnaround Time (TAT) *
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoComputeTAT}
                          className="text-[10px] text-maple-400 hover:text-maple-300 font-bold flex items-center gap-1 bg-maple-500/10 px-1.5 py-0.5 rounded"
                        >
                          <Calculator className="w-3 h-3" /> Auto
                        </button>
                      </div>
                      <input
                        type="text"
                        value={tatInput}
                        onChange={(e) => setTatInput(e.target.value)}
                        placeholder="e.g. 3 days"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sky-300 font-mono font-bold focus:outline-none focus:border-maple-500 text-xs"
                        required
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Completed Date − Assigned Date
                      </span>
                    </div>

                    {/* Field 3: Efficiency */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-200 font-bold text-[11px]">
                          3. Efficiency Score (%) *
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoComputeEfficiency}
                          className="text-[10px] text-maple-400 hover:text-maple-300 font-bold flex items-center gap-1 bg-maple-500/10 px-1.5 py-0.5 rounded"
                        >
                          <Calculator className="w-3 h-3" /> Auto
                        </button>
                      </div>
                      <input
                        type="text"
                        value={efficiencyInput}
                        onChange={(e) => setEfficiencyInput(e.target.value)}
                        placeholder="e.g. 95%"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-maple-300 font-mono font-bold focus:outline-none focus:border-maple-500 text-xs"
                        required
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        On-time delivery + Quality + Error rate
                      </span>
                    </div>
                  </div>

                  {/* Manager Feedback Notes */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-slate-200 font-semibold block text-xs">
                      Manager Evaluation Notes & Feedback (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder="e.g. Great velocity on marketplace checkout module, clean code documentation..."
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" type="button" onClick={() => setAssessingLog(null)}>
                Cancel
              </Button>
              <GradientButton size="sm" type="submit" disabled={isSavingAssessment} leftIcon={<Save className="w-4 h-4" />}>
                {isSavingAssessment ? 'Saving Evaluation...' : 'Save Performance Assessment'}
              </GradientButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
