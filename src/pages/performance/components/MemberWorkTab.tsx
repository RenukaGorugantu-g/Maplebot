// ==============================================================================
// MapleBot: Pod Member Multi-Task Work Performance Table
// Direct Multi-Row Spreadsheet Table: Log 3-4 Tasks/day with Deliverables Count
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { googleChatService } from '../../../services/googleChatService';
import { PerformanceWorkLog, WorkCategory, WorkPriority, QualityRating } from '../../../types/performance';
import { performanceExportService } from '../../../services/performanceExportService';
import { Button, GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Avatar } from '../../../components/ui/Avatar';
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Table as TableIcon,
  Search,
  HelpCircle,
  Sparkles,
  Layers,
  Calendar,
  User,
  Download,
  Users,
  CheckSquare,
  MessageSquare,
  Edit2,
  Save,
} from 'lucide-react';

interface TaskDraftRow {
  id: string;
  category: WorkCategory;
  projectName: string;
  task: string;
  assignedDate: string;
  completedDate: string; // Member Completed Date (Single source of truth)
  timeInvested: number;
  unitCountCompleted: number; // Deliverables count (e.g. 1 feature, 3 pages, 5 leads)
  reviewAssignedDate?: string;
  feedbackComments: string; // Individual task Feedback / Comments
  comments: string;
  blocker: string;
}

export const MemberWorkTab: React.FC = () => {
  const { profile, userPod, isPodLead, isManager, isAdmin, currentRole } = useAuth();
  const isPrivileged = Boolean(isPodLead || isManager || isAdmin);
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to calculate the previous working day (skips weekends: Mon -> Fri, Sun -> Fri, Sat -> Fri)
  const getPreviousWorkingDay = () => {
    const d = new Date();
    const day = d.getDay();
    let daysBack = 1;
    if (day === 1) daysBack = 3; // Monday -> previous Friday
    else if (day === 0) daysBack = 2; // Sunday -> previous Friday
    else if (day === 6) daysBack = 1; // Saturday -> previous Friday
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().split('T')[0];
  };

  const prevWorkingDay = getPreviousWorkingDay();

  const getFormattedTime = () => {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Reporting Work Date (Previous working day by default) & Check-in / Submission Time
  const [workDate] = useState<string>(prevWorkingDay);
  const [checkinTime, setCheckinTime] = useState<string>(getFormattedTime());

  // Keep live time updated
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCheckinTime(getFormattedTime());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Multi-task draft rows state (Starts with 1 mandatory task row with initial hours at 0)
  const [taskRows, setTaskRows] = useState<TaskDraftRow[]>([
    {
      id: 'row-1',
      category: 'Development',
      projectName: '',
      task: '',
      assignedDate: prevWorkingDay,
      completedDate: prevWorkingDay,
      timeInvested: 0,
      unitCountCompleted: 1,
      reviewAssignedDate: prevWorkingDay,
      feedbackComments: '',
      comments: '',
      blocker: '',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ledger mode for Managers/Leads: 'team' (default for privileged) vs 'own'
  const [ledgerMode, setLedgerMode] = useState<'team' | 'own'>(isPrivileged ? 'team' : 'own');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Review Modal State
  const [reviewingLog, setReviewingLog] = useState<PerformanceWorkLog | null>(null);
  const [reviewerComments, setReviewerComments] = useState<string>('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<string>('');
  const [reviewCompletedDate, setReviewCompletedDate] = useState<string>('');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [qualityRating, setQualityRating] = useState<QualityRating>('Excellent');
  const [efficiencyRating, setEfficiencyRating] = useState<string>('95%');
  const [reviewerName, setReviewerName] = useState<string>(profile?.full_name || 'Reviewer');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [reviewModalError, setReviewModalError] = useState<string>('');

  // Add new task row (Allows adding 2nd, 3rd, 4th, or more tasks with initial hours at 0)
  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    setTaskRows((prev) => [
      ...prev,
      {
        id: newId,
        category: 'Development',
        projectName: '',
        task: '',
        assignedDate: workDate,
        completedDate: workDate,
        timeInvested: 0,
        unitCountCompleted: 1,
        reviewAssignedDate: workDate,
        feedbackComments: '',
        comments: '',
        blocker: '',
      },
    ]);
  };

  // Remove task row (Keeps at least 1 row)
  const handleRemoveRow = (rowId: string) => {
    if (taskRows.length === 1) {
      setErrorMsg('At least 1 task deliverable is required.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setTaskRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Update specific field in row
  const handleUpdateRow = (rowId: string, field: keyof TaskDraftRow, value: any) => {
    setTaskRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  // Calculate live daily totals
  const totalHours = useMemo(() => {
    return Math.round(taskRows.reduce((acc, r) => acc + (Number(r.timeInvested) || 0), 0) * 10) / 10;
  }, [taskRows]);

  const totalDeliverables = useMemo(() => {
    return taskRows.reduce((acc, r) => acc + (Number(r.unitCountCompleted) || 0), 0);
  }, [taskRows]);

  // Submit all rows for the day
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: ensure every operational required field is filled
    for (let i = 0; i < taskRows.length; i++) {
      const r = taskRows[i];
      if (!r.projectName.trim()) {
        setErrorMsg(`Task #${i + 1}: Project Name is required.`);
        return;
      }
      if (!r.task.trim()) {
        setErrorMsg(`Task #${i + 1}: Task Deliverable description is required.`);
        return;
      }
      if (!r.assignedDate) {
        setErrorMsg(`Task #${i + 1}: Assigned Date is required.`);
        return;
      }
      if (!r.timeInvested || Number(r.timeInvested) <= 0) {
        setErrorMsg(`Task #${i + 1}: Hours Invested must be greater than 0.`);
        return;
      }
      if (!r.unitCountCompleted || Number(r.unitCountCompleted) < 1) {
        setErrorMsg(`Task #${i + 1}: Units Count must be at least 1.`);
        return;
      }
      if (!r.completedDate) {
        setErrorMsg(`Task #${i + 1}: Completed Date is required.`);
        return;
      }
    }

    const validRows = taskRows;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      validRows.forEach((r) => {
        const combinedComments = [
          r.feedbackComments.trim(),
          r.comments.trim(),
          r.blocker.trim() ? `🚨 BLOCKER: ${r.blocker.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        dataStore.submitMemberWork({
          employee_id: profile?.id || '',
          employee_name: profile?.full_name || 'Team Member',
          date: workDate,
          submission_time: checkinTime,
          checkin_time: checkinTime,
          project_name: r.projectName.trim() || 'General',
          project: r.projectName.trim() || 'General',
          task: r.task.trim(),
          task_title: r.task.trim(),
          assigned_date: r.assignedDate || workDate,
          completed_date: r.completedDate || workDate,
          time_invested: Number(r.timeInvested) || 0,
          duration_hours: Number(r.timeInvested) || 0,
          unit_count_completed: Number(r.unitCountCompleted) || 1,
          review_assigned_date: r.completedDate || workDate,
          feedback_comments: r.feedbackComments.trim(),
          comments: combinedComments,
          category: r.category || 'Development',
          priority: r.blocker.trim() ? 'high' : 'medium',
        });
      });

      // Dispatch high-level summary overview to Google Chat (with highlighted red blockers)
      const memberPod = profile?.pod_id ? dataStore.getPodById(profile.pod_id) : userPod;
      const podName = memberPod?.name || userPod?.name || 'eLearning';
      const memberName = profile?.full_name || 'Team Member';

      googleChatService.sendWorkDeliverablesSummaryCard({
        memberName,
        podName,
        date: workDate,
        checkinTime: checkinTime,
        tasks: validRows.map((r) => ({
          projectName: r.projectName.trim() || 'General',
          task: r.task.trim(),
          timeInvested: Number(r.timeInvested) || 0,
          unitCountCompleted: Number(r.unitCountCompleted) || 1,
          comments: r.feedbackComments.trim() || r.comments.trim(),
          blocker: r.blocker.trim(),
        })),
      }).catch((err) => console.warn('GChat summary notice:', err));

      setSuccessNotice(`🎉 Fantastic work! Successfully submitted ${validRows.length} task deliverable(s) for ${workDate} at ${checkinTime}! High-level overview dispatched to Google Chat with blockers highlighted.`);
      setTimeout(() => setSuccessNotice(''), 7000);

      // Reset empty rows with hours set to 0
      setTaskRows([
        {
          id: `row-${Date.now()}-1`,
          category: 'Development',
          projectName: '',
          task: '',
          assignedDate: workDate,
          completedDate: workDate,
          timeInvested: 0,
          unitCountCompleted: 1,
          reviewAssignedDate: workDate,
          feedbackComments: '',
          comments: '',
          blocker: '',
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit work updates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const podId = profile?.pod_id || userPod?.id;

  // Retrieve team members for dropdown
  const allProfiles = useMemo(() => dataStore.getProfiles().filter((p) => p.status === 'active'), []);
  const availableTeamProfiles = useMemo(() => {
    if (isAdmin) return allProfiles;
    if (podId) {
      return allProfiles.filter(
        (p) => p.pod_id === podId || (p.pod_ids && p.pod_ids.includes(podId))
      );
    }
    return allProfiles;
  }, [allProfiles, podId, isAdmin]);

  // Query member's own logs for history ledger
  const memberLogs = useMemo(() => {
    if (!profile?.id) return [];
    return dataStore.getPerformanceWorkLogs({
      employeeId: profile.id,
    });
  }, [profile?.id, isSubmitting, isSavingReview]);

  // Query team logs for Managers / Pod Leads / Admins
  const teamLogs = useMemo(() => {
    if (!isPrivileged) return [];
    if (isAdmin) {
      return dataStore.getPerformanceWorkLogs({});
    }
    return dataStore.getPerformanceWorkLogs(podId ? { podId } : {});
  }, [isPrivileged, isAdmin, podId, isSubmitting, isSavingReview]);

  // Active ledger list depending on selected mode
  const activeLogs = ledgerMode === 'team' && isPrivileged ? teamLogs : memberLogs;

  // Pending reviews count
  const pendingReviewsCount = useMemo(() => {
    return teamLogs.filter(
      (l) => l.workflow_status === 'submitted' || !l.workflow_status
    ).length;
  }, [teamLogs]);

  // Filtered ledger logs
  const filteredLogs = useMemo(() => {
    return activeLogs.filter((l) => {
      // Member filter (team mode)
      if (ledgerMode === 'team' && selectedMemberFilter && l.employee_id !== selectedMemberFilter) {
        return false;
      }
      // Status filter
      if (statusFilter) {
        if (statusFilter === 'pending' && l.workflow_status !== 'submitted' && l.workflow_status) return false;
        if (statusFilter === 'pod_lead_reviewed' && l.workflow_status !== 'pod_lead_reviewed') return false;
        if (statusFilter === 'manager_reviewed' && l.workflow_status !== 'manager_reviewed') return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.task && l.task.toLowerCase().includes(q)) ||
        (l.project_name && l.project_name.toLowerCase().includes(q)) ||
        (l.project && l.project.toLowerCase().includes(q)) ||
        (l.employee_name && l.employee_name.toLowerCase().includes(q)) ||
        (l.feedback_comments && l.feedback_comments.toLowerCase().includes(q)) ||
        (l.reviewer_comments && l.reviewer_comments.toLowerCase().includes(q)) ||
        (l.comments && l.comments.toLowerCase().includes(q))
      );
    });
  }, [activeLogs, ledgerMode, selectedMemberFilter, statusFilter, searchQuery]);

  // Open Review Modal
  const openReviewModal = (log: PerformanceWorkLog) => {
    setReviewingLog(log);
    setReviewerComments(log.reviewer_comments || '');
    setExpectedCompletionDate(log.expected_completion_date || log.assigned_date || todayStr);
    setReviewCompletedDate(log.review_completed_date || todayStr);
    setErrorCount(log.error_count ?? log.errors ?? 0);
    setReviewerName(log.reviewer || profile?.full_name || 'Reviewer');
    setQualityRating(typeof log.quality === 'string' ? (log.quality as QualityRating) : 'Excellent');
    setEfficiencyRating(String(log.efficiency || '95%'));
    setReviewModalError('');
  };

  // Save Review & Feedback
  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingLog) return;
    if (!reviewerComments.trim()) {
      setReviewModalError('Please enter reviewer comments / feedback before submitting.');
      return;
    }

    setIsSavingReview(true);
    setReviewModalError('');

    try {
      // 1. Save Pod Lead Review (Preserves member's completed_date as single source of truth)
      const updated = dataStore.savePodLeadReview(reviewingLog.id, {
        expected_completion_date: expectedCompletionDate,
        completed_date: reviewingLog.completed_date || reviewingLog.date,
        review_completed_date: reviewCompletedDate,
        reviewer: reviewerName.trim(),
        error_count: Number(errorCount),
        reviewer_comments: reviewerComments.trim(),
      });

      // 2. If Manager or Admin, also record manager performance fields
      if (isManager || isAdmin) {
        dataStore.saveManagerPerformance(reviewingLog.id, {
          quality: qualityRating,
          efficiency: efficiencyRating,
          reviewer_comments: reviewerComments.trim(),
          manager_comments: reviewerComments.trim(),
        });
      }

      // 3. Dispatch Google Chat card tagging employee (<users/${memberEmail}> or @${memberName})
      if (updated) {
        googleChatService.sendReviewEvaluationCard({
          log: {
            ...updated,
            reviewer_comments: reviewerComments.trim(),
          },
          reviewerName: reviewerName.trim() || profile?.full_name || 'Reviewer',
          reviewerRole: isManager || isAdmin ? 'Manager' : 'Pod Lead',
          errorCount: Number(errorCount),
          comments: reviewerComments.trim(),
        }).catch((err) => console.warn('GChat review evaluation card notice:', err));

        // 4. Trigger in-app feedback notification
        if (reviewingLog.employee_id) {
          dataStore.addFeedbackNotification({
            profileId: reviewingLog.employee_id,
            memberName: reviewingLog.employee_name,
            reviewerName: reviewerName.trim() || profile?.full_name || 'Reviewer',
            date: reviewingLog.date,
            comments: reviewerComments.trim(),
            workLogId: reviewingLog.id,
          });
        }
      }

      setSuccessNotice(`✅ Review & feedback successfully saved for ${reviewingLog.employee_name}! Notification & Google Chat tag sent.`);
      setTimeout(() => setSuccessNotice(''), 6000);
      setReviewingLog(null);
    } catch (err: any) {
      setReviewModalError(err.message || 'Failed to save review feedback.');
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. INTERACTIVE MULTI-TASK DAILY WORK TABLE */}
      <div className="glass-card p-6 lg:p-7 border border-slate-800 space-y-6 shadow-2xl bg-[#081426]/95">
        {/* Top Header & Daily Meta */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-maple-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-maple-400 flex items-center gap-1.5">
                <TableIcon className="w-4 h-4" />
                Daily Multi-Task Performance Table (Pod Member Entry)
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white tracking-normal mt-1">
              Log Previous Day's Work Tasks & Deliverables
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Enter the tasks you worked on during the previous working day, including time invested, deliverables completed, completion details, and relevant feedback. Submit all tasks together for Pod Lead review.
            </p>
          </div>

          {/* Date, Check-in Time & Member Badge (Read-Only to prevent tampering) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Reporting Work Date Badge */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-sm shadow-sm select-none" title="Date of the previous working day being reported">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-slate-400 font-medium">Work Date:</span>
              <span className="text-white font-mono font-bold">{workDate}</span>
            </div>

            {/* Check-in / Submission Time (Non-Editable) */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-sm shadow-sm select-none" title="Today's submission check-in time">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 font-medium">Check-in:</span>
              <span className="text-emerald-300 font-mono font-bold">{checkinTime}</span>
            </div>

            {/* Member Name Badge */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-sm shadow-sm select-none">
              <User className="w-4 h-4 text-sky-400" />
              <span className="text-slate-200 font-bold">{profile?.full_name || 'Team Member'}</span>
            </div>
          </div>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-2.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* THE EDITABLE MULTI-TASK TABLE GRID (Spacious, Clear & Clean) */}
        <form onSubmit={handleSubmitAll} className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-[#060E1A] shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1280px]">
              <thead>
                <tr className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  <th className="py-3 px-3 w-10 text-center text-slate-500">#</th>
                  <th className="py-3 px-3 w-[160px]">Project Name</th>
                  <th className="py-3 px-3 min-w-[260px]">Task Deliverable (Specific activity)</th>
                  <th className="py-3 px-3 w-[135px]">Assigned Date</th>
                  <th className="py-3 px-3 w-[115px] text-left">Hours</th>
                  <th className="py-3 px-3 w-[100px] text-left">
                    <div className="flex items-center gap-1">
                      <span>Units</span>
                      <span
                        title="Quantity of finished items: e.g. 1 feature, 3 pages, 5 leads"
                        className="cursor-help text-maple-400"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-3 w-[135px] text-sky-300">Completed Date</th>
                  <th className="py-3 px-3 min-w-[220px] text-maple-300">Feedback / Comments</th>
                  <th className="py-3 px-3 min-w-[170px]">
                    <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span>Blockers</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </div>
                  </th>
                  <th className="py-3 px-2 w-10 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {taskRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold text-xs">
                      {idx + 1}
                    </td>

                    {/* Project Name */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.projectName}
                        onChange={(e) => handleUpdateRow(row.id, 'projectName', e.target.value)}
                        placeholder="e.g. MapleBot, LXD..."
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs font-medium"
                        required
                      />
                    </td>

                    {/* Task Description */}
                    <td className="py-2.5 px-3">
                      <textarea
                        rows={2}
                        value={row.task}
                        onChange={(e) => handleUpdateRow(row.id, 'task', e.target.value)}
                        placeholder={`Task ${idx + 1}: Detailed description of what you completed...`}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs resize-none font-medium leading-relaxed"
                        required
                      />
                    </td>

                    {/* Assigned Date */}
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        value={row.assignedDate}
                        onChange={(e) => handleUpdateRow(row.id, 'assignedDate', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:border-maple-500 text-xs cursor-pointer font-medium"
                        required
                      />
                    </td>

                    {/* Hours Invested - Clean, Non-Squished with inner 'hrs' badge */}
                    <td className="py-2.5 px-3 text-left">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.25"
                          min="0.1"
                          max="24"
                          value={row.timeInvested === 0 ? '' : row.timeInvested}
                          onChange={(e) => {
                            const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleUpdateRow(row.id, 'timeInvested', v);
                          }}
                          placeholder="0.0"
                          className="w-full pr-7 pl-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-sky-400 font-mono font-bold text-xs focus:outline-none focus:border-maple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                        <span className="absolute right-2 text-[10px] text-slate-400 font-medium pointer-events-none">hrs</span>
                      </div>
                    </td>

                    {/* Deliverables Count - Clean with inner 'items' badge */}
                    <td className="py-2.5 px-3 text-left">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={row.unitCountCompleted === 0 ? '' : row.unitCountCompleted}
                          onChange={(e) => {
                            const v = e.target.value === '' ? 1 : parseInt(e.target.value);
                            handleUpdateRow(row.id, 'unitCountCompleted', v);
                          }}
                          placeholder="1"
                          className="w-full pr-10 pl-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-purple-300 font-mono font-bold text-xs focus:outline-none focus:border-maple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                        <span className="absolute right-2 text-[10px] text-slate-400 font-medium pointer-events-none">items</span>
                      </div>
                    </td>

                    {/* Completed Date (Member Single Source of Truth) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        value={row.completedDate}
                        onChange={(e) => handleUpdateRow(row.id, 'completedDate', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-sky-300 font-medium focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                        required
                      />
                    </td>

                    {/* Individual Task Feedback / Comments */}
                    <td className="py-2.5 px-3">
                      <textarea
                        rows={2}
                        value={row.feedbackComments}
                        onChange={(e) => handleUpdateRow(row.id, 'feedbackComments', e.target.value)}
                        placeholder="Task feedback / comments..."
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs resize-none font-medium leading-relaxed"
                      />
                    </td>

                    {/* Blockers / Impediments - Clean & uncluttered */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.blocker}
                        onChange={(e) => handleUpdateRow(row.id, 'blocker', e.target.value)}
                        placeholder="Blocker or issue (if any)..."
                        className={`w-full px-2.5 py-1.5 bg-slate-900 border ${
                          row.blocker.trim()
                            ? 'border-rose-500/80 bg-rose-950/20 text-rose-200 font-semibold'
                            : 'border-slate-700/80 text-slate-300'
                        } rounded-lg placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs`}
                      />
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete task row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Add Row + Live Metrics + Submit All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddRow}
                leftIcon={<Plus className="w-4 h-4 text-maple-400" />}
              >
                Add Another Task Row
              </Button>

              <div className="hidden md:flex items-center gap-4 pl-3 border-l border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Total Tasks: </span>
                  <span className="font-bold text-white font-mono">{taskRows.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Hours: </span>
                  <span className="font-bold text-sky-400 font-mono">{totalHours} hrs</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Deliverables: </span>
                  <span className="font-bold text-purple-300 font-mono">{totalDeliverables} items</span>
                </div>
              </div>
            </div>

            <GradientButton
              type="submit"
              size="sm"
              disabled={isSubmitting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              {isSubmitting ? 'Submitting Tasks...' : `Submit All Tasks (${taskRows.length} Tasks • ${totalHours} hrs)`}
            </GradientButton>
          </div>
        </form>
      </div>

      {/* 2. SUBMITTED WORK HISTORY & TEAM REVIEW LEDGER */}
      <div className="space-y-4">
        {/* Ledger Header & Toggle Switcher for Privileged Users */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-maple-400" />
                {ledgerMode === 'team' && isPrivileged ? "Team Members' Task Submissions & Review" : 'My Submitted Tasks Ledger'}
              </h3>
              {isPrivileged && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                  {userPod?.name || (isAdmin ? 'All Organization Pods' : 'Pod View')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {ledgerMode === 'team' && isPrivileged
                ? "Review your team members' daily task submissions, inspect member feedback, and provide evaluation comments synced to Google Chat."
                : 'Previously submitted tasks, review status from Pod Lead, and quality evaluations from Manager.'}
            </p>
          </div>

          {/* Mode Toggle for Managers / Pod Leads / Admins */}
          {isPrivileged && (
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setLedgerMode('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ledgerMode === 'team'
                    ? 'bg-maple-500/20 border border-maple-500/40 text-maple-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Submissions</span>
                {pendingReviewsCount > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold">
                    {pendingReviewsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode('own')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ledgerMode === 'own'
                    ? 'bg-maple-500/20 border border-maple-500/40 text-maple-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Own Tasks</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, deliverables, projects..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
              />
            </div>

            {/* Member Filter (Team Mode only) */}
            {ledgerMode === 'team' && isPrivileged && (
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                <option value="">All Team Members ({availableTeamProfiles.length})</option>
                {availableTeamProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Workflow Statuses</option>
              <option value="pending">⏳ Pending Review</option>
              <option value="pod_lead_reviewed">🔍 Pod Lead Reviewed</option>
              <option value="manager_reviewed">✅ Manager Reviewed</option>
            </select>
          </div>

          {/* Export Excel Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              performanceExportService.exportStructuredWorkLogsToXLSX(
                filteredLogs,
                `MapleBot_${ledgerMode === 'team' ? 'Team' : 'My'}_Work_Tasks_${new Date().toISOString().split('T')[0]}`
              )
            }
            leftIcon={<Download className="w-3.5 h-3.5 text-maple-400" />}
          >
            Export Excel (.xlsx)
          </Button>
        </div>

        {/* The Ledger Table */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
          {filteredLogs.length === 0 ? (
            <div className="p-10">
              <EmptyState
                title={ledgerMode === 'team' ? 'No team task submissions found' : 'No submitted tasks yet'}
                description={
                  ledgerMode === 'team'
                    ? 'No task submissions match the selected filters for your team.'
                    : 'Use the multi-task table above to log and submit your daily deliverables.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
                <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  <tr>
                    {ledgerMode === 'team' && isPrivileged && (
                      <th className="py-3 px-3.5 whitespace-nowrap min-w-[160px]">Team Member</th>
                    )}
                    <th className="py-3 px-3.5 whitespace-nowrap">Date & Check-in Time</th>
                    <th className="py-3 px-3.5 whitespace-nowrap min-w-[140px]">Project</th>
                    <th className="py-3 px-3.5 min-w-[240px]">Task Deliverable</th>
                    <th className="py-3 px-3.5 text-left whitespace-nowrap">Hours</th>
                    <th className="py-3 px-3.5 text-left whitespace-nowrap">Deliverables</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-sky-300">Completed Date</th>
                    <th className="py-3 px-3.5 min-w-[200px] text-maple-300">Member Feedback</th>
                    <th className="py-3 px-3.5 min-w-[200px] text-emerald-300">Reviewer Comments</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Workflow Status</th>
                    {isPrivileged && (
                      <th className="py-3 px-3.5 text-center whitespace-nowrap">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Teammate Column (Team Mode) */}
                      {ledgerMode === 'team' && isPrivileged && (
                        <td className="py-3 px-3.5 whitespace-nowrap align-top">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.employee_name || 'Member'} size="sm" />
                            <div>
                              <span className="font-bold text-white text-xs block">
                                {row.employee_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {row.department || row.pod_name || 'Pod Member'}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Date & Check-in Time */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        <span className="font-mono text-xs text-white block font-bold">{row.date}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mt-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          {row.submission_time || row.checkin_time || '10:00 AM'}
                        </span>
                      </td>

                      {/* Project */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        <span className="text-xs font-semibold text-slate-200 block">
                          {row.project_name || row.project || 'General'}
                        </span>
                      </td>

                      {/* Task */}
                      <td className="py-3 px-3.5 align-top">
                        <span className="font-medium text-slate-100 block text-xs leading-relaxed">
                          {row.task || row.task_title}
                        </span>
                      </td>

                      {/* Hours */}
                      <td className="py-3 px-3.5 text-left font-mono text-sky-400 font-bold whitespace-nowrap align-top text-xs">
                        {row.time_invested || row.duration_hours}h
                      </td>

                      {/* Deliverables */}
                      <td className="py-3 px-3.5 text-left font-mono text-purple-300 font-bold whitespace-nowrap align-top text-xs">
                        {row.unit_count_completed || 1} items
                      </td>

                      {/* Completed Date (Member Single Source of Truth) */}
                      <td className="py-3 px-3.5 font-mono text-xs text-sky-300 whitespace-nowrap align-top">
                        {row.completed_date || row.review_assigned_date || row.date}
                      </td>

                      {/* Member Feedback */}
                      <td className="py-3 px-3.5 text-slate-300 text-xs align-top">
                        {row.feedback_comments ? (
                          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                            {row.feedback_comments}
                          </div>
                        ) : row.comments ? (
                          <div className="text-slate-400 text-[11px] italic">{row.comments}</div>
                        ) : (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>

                      {/* Reviewer Comments */}
                      <td className="py-3 px-3.5 text-xs align-top">
                        {row.reviewer_comments ? (
                          <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-800/40 text-emerald-200 text-[11px] leading-relaxed">
                            <span className="font-semibold text-emerald-400 block mb-0.5 text-[10px] uppercase">
                              Reviewed by {row.reviewer || 'Lead'}:
                            </span>
                            {row.reviewer_comments}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Pending review</span>
                        )}
                      </td>

                      {/* Workflow Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap align-top">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            row.workflow_status === 'manager_reviewed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : row.workflow_status === 'pod_lead_reviewed'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {row.workflow_status === 'manager_reviewed'
                            ? 'Manager Reviewed'
                            : row.workflow_status === 'pod_lead_reviewed'
                            ? 'Pod Lead Reviewed'
                            : 'Submitted to Lead'}
                        </span>
                      </td>

                      {/* In-Line Review / Give Feedback Action */}
                      {isPrivileged && (
                        <td className="py-3 px-3.5 text-center whitespace-nowrap align-top">
                          {row.workflow_status === 'submitted' || !row.workflow_status ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openReviewModal(row)}
                              leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                            >
                              Review & Feedback
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openReviewModal(row)}
                              leftIcon={<Edit2 className="w-3.5 h-3.5 text-maple-400" />}
                            >
                              Edit Review
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. REVIEW & GIVE FEEDBACK MODAL */}
      {reviewingLog && (
        <Modal
          isOpen={Boolean(reviewingLog)}
          onClose={() => setReviewingLog(null)}
          title={`Review Deliverable: ${reviewingLog.employee_name}`}
          subtitle={`Task evaluation and constructive feedback synced to Google Chat.`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveReview} className="space-y-5">
            {/* Task Overview Card */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Teammate: </span>
                  <span className="text-white font-bold">{reviewingLog.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Work Date: </span>
                  <span className="text-white font-mono font-bold">{reviewingLog.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Hours Invested: </span>
                  <span className="text-sky-400 font-mono font-bold">{reviewingLog.time_invested || reviewingLog.duration_hours}h</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Units Completed: </span>
                  <span className="text-purple-300 font-mono font-bold">{reviewingLog.unit_count_completed || 1} items</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs font-medium block">Project & Task Description:</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  <span className="text-maple-400 font-bold">[{reviewingLog.project_name || reviewingLog.project || 'General'}]</span>{' '}
                  {reviewingLog.task || reviewingLog.task_title}
                </p>
              </div>

              {/* Completed Date (Read-Only from member) */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Member Completed Date:</span>
                <span className="text-sky-300 font-mono font-bold">
                  {reviewingLog.completed_date || reviewingLog.review_assigned_date || reviewingLog.date}
                </span>
                <span className="text-[10px] text-slate-500 italic">(Single source of truth entered by member)</span>
              </div>

              {/* Member Feedback Section */}
              {reviewingLog.feedback_comments && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-maple-500/20 text-xs">
                  <span className="text-maple-400 font-bold flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Member's Task Feedback / Notes:
                  </span>
                  <p className="text-slate-200 leading-relaxed font-normal">
                    {reviewingLog.feedback_comments}
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {reviewModalError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{reviewModalError}</span>
              </div>
            )}

            {/* Reviewer Feedback Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Reviewer Comments / Constructive Feedback *</span>
                <span className="text-[10px] text-maple-400 font-normal">Tagged to employee in Google Chat</span>
              </label>
              <textarea
                rows={3}
                value={reviewerComments}
                onChange={(e) => setReviewerComments(e.target.value)}
                placeholder="Provide constructive feedback, verification notes, or praise for this deliverable..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 resize-none font-medium leading-relaxed"
                required
              />
            </div>

            {/* Review Meta Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Review Completed Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Review Completed Date</label>
                <input
                  type="date"
                  value={reviewCompletedDate}
                  onChange={(e) => setReviewCompletedDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500"
                  required
                />
              </div>

              {/* Error Count */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Errors Identified (Count)</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={errorCount}
                  onChange={(e) => setErrorCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-maple-500"
                />
              </div>

              {/* Reviewer Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Reviewer Name</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500"
                  required
                />
              </div>
            </div>

            {/* Manager Evaluation Fields (if Manager or Admin) */}
            {(isManager || isAdmin) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Quality Assessment</label>
                  <select
                    value={qualityRating}
                    onChange={(e) => setQualityRating(e.target.value as QualityRating)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
                  >
                    <option value="Excellent">⭐ Excellent (5.0)</option>
                    <option value="Good">👍 Good (4.0)</option>
                    <option value="Satisfactory">👌 Satisfactory (3.0)</option>
                    <option value="Needs Improvement">⚠️ Needs Improvement (2.0)</option>
                    <option value="Poor">❌ Poor (1.0)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Efficiency %</label>
                  <input
                    type="text"
                    value={efficiencyRating}
                    onChange={(e) => setEfficiencyRating(e.target.value)}
                    placeholder="e.g. 95%, 100%"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReviewingLog(null)}
                disabled={isSavingReview}
              >
                Cancel
              </Button>

              <GradientButton
                type="submit"
                size="sm"
                disabled={isSavingReview}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSavingReview ? 'Saving & Dispatching...' : 'Save Review & Dispatch to GChat'}
              </GradientButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
