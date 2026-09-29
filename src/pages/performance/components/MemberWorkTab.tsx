// ==============================================================================
// MapleBot: Pod Member Multi-Task Work Performance Table
// Direct Multi-Row Spreadsheet Table: Log 3-4 Tasks/day with Deliverables Count
// ==============================================================================

import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
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
  ClipboardList,
  Sun,
  Moon,
  Lock,
  Unlock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  getTodayIST,
  getTimeIST,
  getPreviousWorkingDayIST,
  formatDateFriendlyIST,
  formatMinutesToFriendly,
  isEveningCheckoutPeriodIST,
} from '../../../utils/timezone';
import {
  DailyWorkSession,
  DailyActionItem,
  ActionItemStatus,
} from '../../../types/attendance';

interface TaskDraftRow {
  id: string;
  category: WorkCategory;
  projectName: string;
  task: string;
  assignedDate: string;
  completedDate: string; // Member Completed Date (Single source of truth)
  timeInvested: number; // Actual hours (backward compatibility)
  estimatedHours?: number; // Estimated hours entered by member
  estimatedTimeMinutes?: number; // Estimated minutes
  actualTimeMinutes?: number; // Actual minutes
  unitCountCompleted: number; // Deliverables count (e.g. 1 feature, 3 pages, 5 leads)
  reviewAssignedDate?: string;
  feedbackComments: string; // Individual task Feedback / Comments
  comments: string;
  blocker: string;
  status: ActionItemStatus; // 'completed' | 'wpi'
  isCarriedForward?: boolean;
  carriedFromDate?: string;
  carriedFromReason?: string;
  wpiReason?: string;
}

export const MemberWorkTab: React.FC = () => {
  const { profile, userPod, isPodLead, isManager, isAdmin, currentRole } = useAuth();
  const { showToast } = useNotifications();
  const isPrivileged = Boolean(isPodLead || isManager || isAdmin);

  const todayStr = getTodayIST();
  const prevWorkingDay = getPreviousWorkingDayIST();

  // Reporting Work Date & Today's Check-in Date / Time (IST)
  const [workDate, setWorkDate] = useState<string>(todayStr);
  const [checkinDate] = useState<string>(todayStr);
  const [liveIstTime, setLiveIstTime] = useState<string>(getTimeIST());
  const [customCheckinTime, setCustomCheckinTime] = useState<string>('');
  const [isEditingCheckinTime, setIsEditingCheckinTime] = useState<boolean>(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [carriedNotice, setCarriedNotice] = useState<string>('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pastedChatText, setPastedChatText] = useState<string>('');

  // Keep live IST time updated every 15 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveIstTime(getTimeIST());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Multi-task draft rows state
  const isFormDirtyRef = useRef<boolean>(false);
  const loadedScopeRef = useRef<string>('');
  const getDraftStorageKey = (empId: string, date: string) => `maplebot_draft_tasks_${empId}_${date}`;

  const [taskRows, setTaskRows] = useState<TaskDraftRow[]>([
    {
      id: 'row-1',
      category: 'Development',
      projectName: '',
      task: '',
      assignedDate: todayStr,
      completedDate: todayStr,
      timeInvested: 0,
      estimatedHours: undefined,
      estimatedTimeMinutes: undefined,
      actualTimeMinutes: undefined,
      unitCountCompleted: 1,
      reviewAssignedDate: todayStr,
      feedbackComments: '',
      comments: '',
      blocker: '',
      status: 'wpi',
      isCarriedForward: false,
      wpiReason: '',
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
  const [tick, setTick] = useState<number>(0);

  React.useEffect(() => {
    const unsub = dataStore.subscribe(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);

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

  const targetEmployeeId = (isPrivileged && selectedEmployeeId) ? selectedEmployeeId : (profile?.id || '');
  const dailySession = useMemo(() => {
    if (!targetEmployeeId) return undefined;
    return dataStore.getDailySession(targetEmployeeId, workDate);
  }, [targetEmployeeId, workDate, tick]);

  const isCheckedIn = Boolean(dailySession?.checkin_time || dailySession?.status === 'checked_in' || dailySession?.status === 'checked_out');
  const isCheckedOut = Boolean(dailySession?.checkout_time || dailySession?.status === 'checked_out');
  const isEveningCheckoutAllowed = isEveningCheckoutPeriodIST(workDate);

  // Automatic load & WPI Carry-Forward on date or employee change (NEVER resets while user is typing)
  React.useEffect(() => {
    if (!targetEmployeeId) return;

    const currentScope = `${targetEmployeeId}::${workDate}`;
    // If the scope has not changed and user has unsaved edits, do NOT overwrite
    if (loadedScopeRef.current === currentScope && isFormDirtyRef.current) {
      return;
    }
    loadedScopeRef.current = currentScope;

    // 0. Check if there are unsaved draft edits in sessionStorage for this employee & date
    try {
      const savedDraftJson = sessionStorage.getItem(getDraftStorageKey(targetEmployeeId, workDate));
      if (savedDraftJson) {
        const parsed = JSON.parse(savedDraftJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTaskRows(parsed);
          isFormDirtyRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading saved task draft:', e);
    }

    // 1. Check existing items for this employee & workDate
    const existingItems = dataStore.getDailyActionItems(targetEmployeeId, workDate);
    if (existingItems.length > 0) {
      setTaskRows(
        existingItems.map((item) => {
          const actualMins = item.actual_time_minutes ?? (item.time_invested ? Math.round(item.time_invested * 60) : undefined);
          const estMins = item.estimated_time_minutes;
          return {
            id: item.id,
            category: (item.category as WorkCategory) || 'Development',
            projectName: item.project_name,
            task: item.task_title,
            assignedDate: item.assigned_date || workDate,
            completedDate: item.completed_date || workDate,
            timeInvested: item.time_invested ?? (actualMins ? Math.round((actualMins / 60) * 100) / 100 : 0),
            estimatedHours: estMins ? Math.round((estMins / 60) * 100) / 100 : undefined,
            estimatedTimeMinutes: estMins,
            actualTimeMinutes: actualMins,
            unitCountCompleted: item.unit_count || 1,
            reviewAssignedDate: item.completed_date || workDate,
            feedbackComments: item.feedback_comments || item.wpi_reason || item.completion_comment || '',
            comments: item.completion_comment || '',
            blocker: item.blocker || '',
            status: item.status || 'wpi',
            isCarriedForward: item.is_carried_forward,
            carriedFromDate: item.carried_from_date,
            carriedFromReason: item.carried_from_reason,
            wpiReason: item.wpi_reason || '',
          };
        })
      );
      isFormDirtyRef.current = false;
      setCarriedNotice('');
      return;
    }

    // 2. If NO items exist yet, check for WPI carry-forward from previous day
    const wpiCarried = dataStore.getPreviousDayWpiItems(targetEmployeeId, workDate);
    if (wpiCarried.length > 0) {
      const prevDate = getPreviousWorkingDayIST(workDate);
      setTaskRows(
        wpiCarried.map((item) => ({
          id: item.id,
          category: (item.category as WorkCategory) || 'Development',
          projectName: item.project_name,
          task: item.task_title,
          assignedDate: item.assigned_date || workDate,
          completedDate: item.completed_date || workDate,
          timeInvested: 0,
          estimatedHours: item.estimated_time_minutes ? Math.round((item.estimated_time_minutes / 60) * 100) / 100 : undefined,
          estimatedTimeMinutes: item.estimated_time_minutes,
          actualTimeMinutes: undefined,
          unitCountCompleted: item.unit_count || 1,
          reviewAssignedDate: workDate,
          feedbackComments: '',
          comments: '',
          blocker: '',
          status: 'wpi',
          isCarriedForward: true,
          carriedFromDate: item.carried_from_date || prevDate,
          carriedFromReason: item.carried_from_reason,
          wpiReason: '',
        }))
      );
      isFormDirtyRef.current = false;
      setCarriedNotice(
        `🔄 Pre-populated ${wpiCarried.length} Work in Progress (WPI) task(s) carried forward from previous working day (${formatDateFriendlyIST(prevDate)}). Review them and add today's action items below!`
      );
    } else {
      setTaskRows([
        {
          id: `row-${Date.now()}-1`,
          category: 'Development',
          projectName: '',
          task: '',
          assignedDate: workDate,
          completedDate: workDate,
          timeInvested: 0,
          estimatedHours: undefined,
          estimatedTimeMinutes: undefined,
          actualTimeMinutes: undefined,
          unitCountCompleted: 1,
          reviewAssignedDate: workDate,
          feedbackComments: '',
          comments: '',
          blocker: '',
          status: 'wpi',
          isCarriedForward: false,
          wpiReason: '',
        },
      ]);
      isFormDirtyRef.current = false;
      setCarriedNotice('');
    }
  }, [targetEmployeeId, workDate]);

  // Add new task row
  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    const newRow: TaskDraftRow = {
      id: newId,
      category: 'Development',
      projectName: '',
      task: '',
      assignedDate: workDate,
      completedDate: workDate,
      timeInvested: 0,
      estimatedHours: undefined,
      estimatedTimeMinutes: undefined,
      actualTimeMinutes: undefined,
      unitCountCompleted: 1,
      reviewAssignedDate: workDate,
      feedbackComments: '',
      comments: '',
      blocker: '',
      status: 'wpi',
      isCarriedForward: false,
      wpiReason: '',
    };
    setTaskRows((prev) => {
      const updated = [...prev, newRow];
      isFormDirtyRef.current = true;
      try {
        sessionStorage.setItem(getDraftStorageKey(targetEmployeeId, workDate), JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Remove task row (Keeps at least 1 row)
  const handleRemoveRow = (rowId: string) => {
    if (taskRows.length === 1) {
      setErrorMsg('At least 1 task deliverable is required.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setTaskRows((prev) => {
      const updated = prev.filter((r) => r.id !== rowId);
      isFormDirtyRef.current = true;
      try {
        sessionStorage.setItem(getDraftStorageKey(targetEmployeeId, workDate), JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Update specific field in row
  const handleUpdateRow = (rowId: string, field: keyof TaskDraftRow, value: any) => {
    setTaskRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, [field]: value };
        // Sync estimated minutes if estimatedHours changed
        if (field === 'estimatedHours') {
          const num = typeof value === 'number' ? value : parseFloat(value);
          next.estimatedTimeMinutes = !isNaN(num) && num > 0 ? Math.round(num * 60) : undefined;
        }
        // Sync actual minutes if timeInvested changed
        if (field === 'timeInvested') {
          const num = typeof value === 'number' ? value : parseFloat(value);
          next.actualTimeMinutes = !isNaN(num) && num > 0 ? Math.round(num * 60) : undefined;
        }
        return next;
      });
      isFormDirtyRef.current = true;
      try {
        sessionStorage.setItem(getDraftStorageKey(targetEmployeeId, workDate), JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Calculate live daily totals
  const totalEstimatedMinutes = useMemo(() => {
    return taskRows.reduce((acc, r) => acc + (r.estimatedTimeMinutes || (r.estimatedHours ? Math.round(r.estimatedHours * 60) : 0)), 0);
  }, [taskRows]);
  const totalEstimatedHours = Math.round((totalEstimatedMinutes / 60) * 10) / 10;

  const totalActualMinutes = useMemo(() => {
    return taskRows.reduce((acc, r) => acc + (r.actualTimeMinutes || (r.timeInvested ? Math.round(r.timeInvested * 60) : 0)), 0);
  }, [taskRows]);
  const totalHours = Math.round((totalActualMinutes / 60) * 10) / 10;

  const totalDeliverables = useMemo(() => {
    return taskRows.reduce((acc, r) => acc + (Number(r.unitCountCompleted) || 0), 0);
  }, [taskRows]);

  // 1. SUBMIT MORNING ACTION ITEMS & CHECK IN (Locks Login Time)
  const handleMorningCheckin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    for (let i = 0; i < taskRows.length; i++) {
      const r = taskRows[i];
      if (!r.projectName.trim()) {
        const msg = `Task #${i + 1}: Project Name is required.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Project Name', msg);
        return;
      }
      if (!r.task.trim()) {
        const msg = `Task #${i + 1}: Task deliverable description is required.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Task Description', msg);
        return;
      }
    }

    setIsSubmitting(true);
    const targetProfile = (isPrivileged && selectedEmployeeId)
      ? dataStore.getProfileById(selectedEmployeeId) || profile
      : profile;
    const targetPod = targetProfile?.pod_id ? dataStore.getPodById(targetProfile.pod_id) : userPod;
    const memberName = targetProfile?.full_name || profile?.full_name || 'Team Member';
    const memberPodName = targetPod?.name || userPod?.name || 'Web & Sales';

    const effectiveCheckin = customCheckinTime || (isCheckedIn ? dailySession?.checkin_time : liveIstTime) || liveIstTime;

    try {
      const result = await dataStore.submitMorningActionItems({
        employee_id: targetProfile?.id || profile?.id || '',
        employee_name: memberName,
        pod_id: targetPod?.id || targetProfile?.pod_id,
        pod_name: memberPodName,
        work_date: workDate,
        checkin_time: effectiveCheckin,
        action_items: taskRows.map((r) => {
          const estMins = r.estimatedTimeMinutes ?? (r.estimatedHours ? Math.round(r.estimatedHours * 60) : undefined);
          const actMins = r.actualTimeMinutes ?? (r.timeInvested ? Math.round(r.timeInvested * 60) : undefined);
          return {
            projectName: r.projectName.trim(),
            task: r.task.trim(),
            assignedDate: r.assignedDate || workDate,
            completedDate: r.completedDate || workDate,
            timeInvested: Number(r.timeInvested) || 0,
            feedbackComments: r.feedbackComments?.trim() || '',
            category: r.category || 'Development',
            isCarriedForward: r.isCarriedForward,
            carriedFromDate: r.carriedFromDate,
            carriedFromReason: r.carriedFromReason,
            estimatedUnits: r.unitCountCompleted || 1,
            estimated_time_minutes: estMins,
            actual_time_minutes: actMins,
            status: 'wpi' as ActionItemStatus,
          };
        }),
      });

      // Clear dirty draft state
      isFormDirtyRef.current = false;
      try {
        sessionStorage.removeItem(getDraftStorageKey(targetEmployeeId, workDate));
      } catch (e) {}

      // Google Chat notification ONLY sent after database write succeeds
      googleChatService.sendMorningActionItemsCard({
        memberName,
        podName: memberPodName,
        workDate,
        checkinTime: result.session.checkin_time || effectiveCheckin,
        items: taskRows.map((r) => ({
          projectName: r.projectName.trim(),
          task: r.task.trim(),
          isCarriedForward: r.isCarriedForward,
          carriedFromDate: r.carriedFromDate,
          carriedReason: r.carriedFromReason,
          estimatedHours: r.estimatedHours,
          estimatedMinutes: r.estimatedTimeMinutes,
        })),
      }).catch((err) => console.warn('GChat morning checkin notice:', err));

      setSuccessNotice(`🌅 Morning check-in confirmed at ${result.session.checkin_time || effectiveCheckin} IST! Action items saved and Google Chat notified.`);
      showToast('success', 'Morning Check-in Confirmed', `Logged in at ${result.session.checkin_time || effectiveCheckin} IST with ${taskRows.length} action item(s).`);
      setTimeout(() => setSuccessNotice(''), 7000);
    } catch (err: any) {
      const msg = err.message || 'Failed to submit morning check-in. Please try again.';
      setErrorMsg(msg);
      showToast('error', 'Check-in Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. SAVE WORK PROGRESS DRAFT (Preserves tasks, dates & hours without locking checkout)
  const handleSaveProgress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    for (let i = 0; i < taskRows.length; i++) {
      const r = taskRows[i];
      if (!r.projectName.trim()) {
        const msg = `Task #${i + 1}: Project Name is required.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Project Name', msg);
        return;
      }
      if (!r.task.trim()) {
        const msg = `Task #${i + 1}: Task deliverable description is required.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Task Description', msg);
        return;
      }
    }

    setIsSubmitting(true);
    const targetProfile = (isPrivileged && selectedEmployeeId)
      ? dataStore.getProfileById(selectedEmployeeId) || profile
      : profile;

    try {
      await dataStore.saveWorkProgress({
        employee_id: targetProfile?.id || profile?.id || '',
        work_date: workDate,
        items: taskRows.map((r) => {
          const estMins = r.estimatedTimeMinutes ?? (r.estimatedHours ? Math.round(r.estimatedHours * 60) : undefined);
          const actMins = r.actualTimeMinutes ?? (r.timeInvested ? Math.round(r.timeInvested * 60) : undefined);
          return {
            id: r.id.startsWith('row-') ? undefined : r.id,
            projectName: r.projectName.trim(),
            task: r.task.trim(),
            assignedDate: r.assignedDate || workDate,
            completedDate: r.completedDate || workDate,
            timeInvested: Number(r.timeInvested) || (actMins ? Math.round((actMins / 60) * 100) / 100 : 0),
            unitCountCompleted: Number(r.unitCountCompleted) || 1,
            feedbackComments: r.feedbackComments?.trim() || '',
            status: r.status,
            wpiReason: r.wpiReason?.trim() || r.feedbackComments?.trim(),
            comments: r.status === 'completed' ? (r.feedbackComments?.trim() || r.comments?.trim()) : undefined,
            blocker: r.blocker?.trim(),
            category: r.category || 'Development',
            isCarriedForward: r.isCarriedForward,
            carriedFromDate: r.carriedFromDate,
            estimated_time_minutes: estMins,
            actual_time_minutes: actMins,
            wip_comment: r.status === 'wpi' ? (r.wpiReason?.trim() || r.feedbackComments?.trim()) : undefined,
          };
        }),
      });

      isFormDirtyRef.current = false;
      try {
        sessionStorage.removeItem(getDraftStorageKey(targetEmployeeId, workDate));
      } catch (e) {}

      setSuccessNotice('💾 Work progress draft saved successfully! You can continue updating tasks throughout the day.');
      showToast('success', 'Progress Draft Saved', 'Your work items and hours draft have been saved.');
      setTimeout(() => setSuccessNotice(''), 5000);
    } catch (err: any) {
      const msg = err.message || 'Failed to save work progress draft.';
      setErrorMsg(msg);
      showToast('error', 'Save Draft Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. SUBMIT END-OF-DAY DELIVERABLES & CHECK OUT (Locks Logout Time)
  const handleEveningCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isCheckedIn) {
      const msg = 'Please submit Morning Check-in first before checking out.';
      setErrorMsg(msg);
      showToast('warning', 'Check-in Required', msg);
      return;
    }

    if (!isEveningCheckoutAllowed) {
      const msg = 'Evening Check-out is only permitted after 3:00 PM IST (or for past dates).';
      setErrorMsg(msg);
      showToast('warning', 'Checkout Unavailable', msg);
      return;
    }

    if (!taskRows || taskRows.length === 0) {
      const msg = 'Please add at least 1 task deliverable before checking out.';
      setErrorMsg(msg);
      showToast('warning', 'No Tasks Added', msg);
      return;
    }

    for (let i = 0; i < taskRows.length; i++) {
      const r = taskRows[i];
      if (!r.projectName.trim()) {
        const msg = `Task #${i + 1}: Project Name is required.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Project Name', msg);
        return;
      }
      if (!r.task.trim()) {
        const msg = `Task #${i + 1}: Task deliverable description is required.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Task Description', msg);
        return;
      }
      // Auto-default assignedDate if empty
      if (!r.assignedDate) {
        r.assignedDate = workDate;
      }
      // Auto-default completedDate if completed
      if (r.status === 'completed' && !r.completedDate) {
        r.completedDate = workDate;
      }
      // If completed, require actual time taken
      const actualMins = r.actualTimeMinutes ?? (r.timeInvested ? Math.round(r.timeInvested * 60) : 0);
      if (r.status === 'completed' && actualMins <= 0) {
        const msg = `Task #${i + 1} ("${r.projectName}"): Please enter the Actual Time Taken before checking out as completed.`;
        setErrorMsg(msg);
        showToast('warning', 'Missing Actual Time', msg);
        return;
      }
      if (r.status === 'wpi') {
        const reason = (r.wpiReason || r.feedbackComments || r.comments || '').trim();
        if (!reason || reason.length < 5) {
          const msg = `Task #${i + 1} ("${r.task}") is marked as Work in Progress (WPI). A mandatory explanation (reason why still in progress & continuation plan) is required before check-out.`;
          setErrorMsg(msg);
          showToast('warning', 'Mandatory WPI Explanation', msg);
          return;
        }
      }
    }

    setIsSubmitting(true);
    const targetProfile = (isPrivileged && selectedEmployeeId)
      ? dataStore.getProfileById(selectedEmployeeId) || profile
      : profile;
    const targetPod = targetProfile?.pod_id ? dataStore.getPodById(targetProfile.pod_id) : userPod;
    const memberName = targetProfile?.full_name || profile?.full_name || 'Team Member';
    const memberPodName = targetPod?.name || userPod?.name || 'Web & Sales';

    try {
      const result = await dataStore.submitEndOfDayCheckout({
        employee_id: targetProfile?.id || profile?.id || '',
        work_date: workDate,
        checkout_time: liveIstTime,
        items: taskRows.map((r) => {
          const estMins = r.estimatedTimeMinutes ?? (r.estimatedHours ? Math.round(r.estimatedHours * 60) : undefined);
          const actMins = r.actualTimeMinutes ?? (r.timeInvested ? Math.round(r.timeInvested * 60) : undefined);
          return {
            id: r.id.startsWith('row-') ? undefined : r.id,
            projectName: r.projectName.trim(),
            task: r.task.trim(),
            assignedDate: r.assignedDate || workDate,
            completedDate: r.status === 'completed' ? (r.completedDate || workDate) : undefined,
            timeInvested: Number(r.timeInvested) || (actMins ? Math.round((actMins / 60) * 100) / 100 : 0),
            unitCountCompleted: Number(r.unitCountCompleted) || 1,
            feedbackComments: r.feedbackComments?.trim() || '',
            status: r.status,
            wpiReason: r.wpiReason?.trim() || r.feedbackComments?.trim(),
            comments: r.status === 'completed' ? (r.feedbackComments?.trim() || r.comments?.trim() || 'Completed on schedule') : undefined,
            blocker: r.blocker?.trim(),
            category: r.category || 'Development',
            isCarriedForward: r.isCarriedForward,
            carriedFromDate: r.carriedFromDate,
            estimated_time_minutes: estMins,
            actual_time_minutes: actMins,
            wip_comment: r.status === 'wpi' ? (r.wpiReason?.trim() || r.feedbackComments?.trim()) : undefined,
          };
        }),
      });

      isFormDirtyRef.current = false;
      try {
        sessionStorage.removeItem(getDraftStorageKey(targetEmployeeId, workDate));
      } catch (e) {}

      const completedCount = taskRows.filter((r) => r.status === 'completed').length;
      const wpiCount = taskRows.filter((r) => r.status === 'wpi').length;

      googleChatService.sendEndOfDayCheckoutCard({
        memberName,
        podName: memberPodName,
        workDate,
        checkinTime: result.session.checkin_time || liveIstTime,
        checkoutTime: result.session.checkout_time || liveIstTime,
        totalHours: result.session.total_hours_invested,
        items: taskRows.map((r) => ({
          projectName: r.projectName.trim(),
          task: r.task.trim(),
          assignedDate: r.assignedDate || workDate,
          completedDate: r.completedDate || workDate,
          timeInvested: Number(r.timeInvested) || (r.actualTimeMinutes ? Math.round((r.actualTimeMinutes / 60) * 10) / 10 : 0),
          unitCountCompleted: Number(r.unitCountCompleted) || 1,
          status: r.status,
          wpiReason: r.wpiReason?.trim() || r.feedbackComments?.trim(),
          comments: r.feedbackComments?.trim() || r.comments?.trim(),
          isCarriedForward: r.isCarriedForward,
        })),
      }).catch((err) => console.warn('GChat checkout notice:', err));

      setSuccessNotice(`🎉 Outstanding work! Successfully checked out at ${result.session.checkout_time} IST (${result.session.total_hours_invested}h logged, ${completedCount} completed, ${wpiCount} WPI carried forward). Overview sent to Google Chat!`);
      showToast('success', 'Evening Check-out Confirmed', `Logged out at ${result.session.checkout_time} IST (${result.session.total_hours_invested}h total). Deliverables saved!`);
      setTimeout(() => setSuccessNotice(''), 8000);
    } catch (err: any) {
      const msg = err.message || 'Failed to submit end-of-day check-out. Please try again.';
      setErrorMsg(msg);
      showToast('error', 'Check-out Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to parse pasted task lines (from Google Chat or notes) into deliverable rows
  const handleParseAndApplyPaste = () => {
    if (!pastedChatText.trim()) return;
    const lines = pastedChatText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsedRows: TaskDraftRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (
        rawLine.startsWith('📋') ||
        rawLine.toLowerCase().includes('daily work deliverables') ||
        rawLine.toLowerCase().startsWith('maplebot') ||
        rawLine.toLowerCase().includes('checked in today')
      ) {
        continue;
      }

      let cleanLine = rawLine.replace(/^(\d+[\.\)]|\-|\*|•)\s*/, '').trim();
      if (!cleanLine) continue;

      let hours = 1;
      const hourMatch = cleanLine.match(/(?:—|-|\(|\/|\|)?\s*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h)\b/i);
      const minsMatch = cleanLine.match(/(?:—|-|\(|\/|\|)?\s*(\d+)\s*(?:mins?|minutes?|m)\b/i);

      if (hourMatch) {
        hours = parseFloat(hourMatch[1]) || 1;
        cleanLine = cleanLine.replace(/(?:—|-|\(|\/|\|)?\s*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h)\s*\)?$/i, '').trim();
      } else if (minsMatch) {
        hours = Math.round((parseInt(minsMatch[1], 10) / 60) * 10) / 10;
        cleanLine = cleanLine.replace(/(?:—|-|\(|\/|\|)?\s*(\d+)\s*(?:mins?|minutes?|m)\s*\)?$/i, '').trim();
      }

      let projectName = 'General';
      let taskText = cleanLine;
      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx > 0 && colonIdx < 45) {
        projectName = cleanLine.substring(0, colonIdx).trim();
        taskText = cleanLine.substring(colonIdx + 1).trim();
      }

      parsedRows.push({
        id: `row-${Date.now()}-${i + 1}`,
        category: 'Development',
        projectName: projectName || 'General',
        task: taskText || cleanLine,
        assignedDate: workDate,
        completedDate: workDate,
        timeInvested: hours,
        estimatedHours: hours,
        estimatedTimeMinutes: Math.round(hours * 60),
        actualTimeMinutes: Math.round(hours * 60),
        unitCountCompleted: 1,
        reviewAssignedDate: workDate,
        feedbackComments: '',
        comments: '',
        blocker: '',
        status: 'wpi',
        isCarriedForward: false,
        wpiReason: '',
      });
    }

    if (parsedRows.length > 0) {
      setTaskRows(parsedRows);
      isFormDirtyRef.current = true;
      try {
        sessionStorage.setItem(getDraftStorageKey(targetEmployeeId, workDate), JSON.stringify(parsedRows));
      } catch (e) {}
      setIsPasteModalOpen(false);
      setPastedChatText('');
    }
  };

  const podId = userPod?.id || profile?.pod_id;

  // Retrieve team members for dropdown
  const allProfiles = useMemo(() => dataStore.getProfiles().filter((p) => p.status === 'active'), [tick]);
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
  }, [profile?.id, isSubmitting, isSavingReview, tick]);

  // Query team logs for Managers / Pod Leads / Admins
  const teamLogs = useMemo(() => {
    if (!isPrivileged) return [];
    if (isAdmin) {
      return dataStore.getPerformanceWorkLogs({});
    }
    return dataStore.getPerformanceWorkLogs(podId ? { podId } : {});
  }, [isPrivileged, isAdmin, podId, isSubmitting, isSavingReview, tick]);

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
                Daily Work & Attendance Workflow (Asia/Kolkata IST)
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white tracking-normal mt-1 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              <span>Daily Work Deliverables & Attendance</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Log your daily deliverables, assign project tasks, track hours invested, and record completion notes. Check in during the morning to lock your login time, save drafts anytime, and check out in the evening to lock your logout time. Any incomplete tasks (WPI) automatically carry forward to the next working day.
            </p>
          </div>

          {/* Date, Check-in Time & Member Badge / Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reporting Work Date Picker */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs shadow-sm" title="Reporting work date">
              <Calendar className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap">Work Date:</span>
              <input
                type="date"
                value={workDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setWorkDate(newDate);
                }}
                className="bg-slate-800 border border-slate-700 text-white font-mono font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
              />
            </div>

            {/* Member Selector or Badge */}
            {isPrivileged ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs shadow-sm">
                <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-slate-400 font-medium whitespace-nowrap">Reporting For:</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-maple-500 cursor-pointer"
                >
                  <option value="">Myself ({profile?.full_name})</option>
                  {availableTeamProfiles
                    .filter((p) => p.id !== profile?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({dataStore.getPodById(p.pod_id)?.name || p.role || 'Member'})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs shadow-sm select-none">
                <User className="w-4 h-4 text-purple-400" />
                <span className="text-slate-200 font-bold">{profile?.full_name || 'Team Member'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Daily Attendance Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
          {/* Left: Check-in & Check-out Live Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Overall Session Status */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Daily Status:</span>
              {isCheckedOut ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Day Completed (Checked Out)
                </span>
              ) : isCheckedIn ? (
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" /> Working Day in Progress
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Action Items Draft (Not Checked In)
                </span>
              )}
            </div>

            {/* Check-in Timestamp */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-sans">Login:</span>
              {dailySession?.checkin_time && !isEditingCheckinTime ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1" title="Confirmed Check-in Time">
                    <Lock className="w-3 h-3 text-emerald-400" /> {dailySession.checkin_time} (Locked)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCheckinTime(dailySession.checkin_time || '09:00 AM');
                      setIsEditingCheckinTime(true);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-300 transition-colors"
                    title="Correct or adjust check-in time"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              ) : isEditingCheckinTime ? (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/50 rounded-lg px-2 py-1 shadow-sm">
                  <span className="text-[10px] text-amber-400 font-sans font-semibold">Time:</span>
                  <input
                    type="text"
                    value={customCheckinTime}
                    onChange={(e) => setCustomCheckinTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-20 bg-slate-950 text-amber-300 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomCheckinTime('09:00 AM')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
                      title="Set to 9:00 AM"
                    >
                      9:00 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCheckinTime(liveIstTime)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
                      title="Set to current live time"
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetTime = customCheckinTime.trim() || '09:00 AM';
                        if (dailySession?.checkin_time && targetEmployeeId) {
                          await dataStore.updateSessionCheckinTime(targetEmployeeId, workDate, targetTime);
                          showToast('success', 'Check-in Time Updated', `Updated check-in time to ${targetTime}`);
                        }
                        setIsEditingCheckinTime(false);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] text-white font-bold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCheckinTime(false)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-300 font-semibold bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1" title="Live IST time (will lock upon check-in)">
                    <Clock className="w-3 h-3 text-amber-400" /> {customCheckinTime || liveIstTime} (Pending)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCheckinTime(customCheckinTime === '09:00 AM' ? '' : '09:00 AM');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      customCheckinTime === '09:00 AM'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                    }`}
                    title="Click to record check-in at 09:00 AM office start time"
                  >
                    {customCheckinTime === '09:00 AM' ? '✓ At 9:00 AM' : 'Set 9:00 AM'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCheckinTime(customCheckinTime || liveIstTime);
                      setIsEditingCheckinTime(true);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-300"
                    title="Enter custom check-in time"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Check-out Timestamp */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-sans">Logout:</span>
              {dailySession?.checkout_time ? (
                <span className="text-sky-300 font-bold bg-sky-950/40 border border-sky-800/60 px-2 py-0.5 rounded flex items-center gap-1" title="Locked server timestamp">
                  <Lock className="w-3 h-3 text-sky-400" /> {dailySession.checkout_time} (Locked)
                </span>
              ) : isCheckedIn ? (
                <span className="text-slate-400 italic bg-slate-900 border border-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" /> Pending Evening Checkout
                </span>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </div>
          </div>

          {/* Right: Quick Workflow Step Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold border ${
                isCheckedIn
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Step 1: Check-in {isCheckedIn ? '✓' : ''}</span>
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold border ${
                isCheckedOut
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span>Step 2: Check-out {isCheckedOut ? '✓' : ''}</span>
            </span>
          </div>
        </div>

        {/* WPI Automatic Carry-Forward Notice Banner */}
        {carriedNotice && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin-slow" />
              <span>{carriedNotice}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 uppercase tracking-wider font-bold">
              Carry-Forward Active
            </span>
          </div>
        )}

        {/* Error and Success Notices */}
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

        {/* THE UNIFIED EDITABLE MULTI-TASK TABLE GRID */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-[#060E1A] shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1780px]">
              <thead>
                <tr className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  <th className="py-3 px-3 w-10 text-center text-slate-500">#</th>
                  <th className="py-3 px-3.5 min-w-[170px] w-[180px]">Project Name</th>
                  <th className="py-3 px-3.5 min-w-[380px] w-[400px]">Task Deliverable (Specific activity)</th>
                  <th className="py-3 px-3 w-[130px]">Assigned Date</th>
                  <th className="py-3 px-2.5 w-[110px] min-w-[105px] text-left text-amber-300">Est. Time</th>
                  <th className="py-3 px-2.5 w-[125px] min-w-[120px] text-left text-sky-300">Actual Time</th>
                  <th className="py-3 px-3 w-[90px] text-left">
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
                  <th className="py-3 px-3 w-[130px] text-sky-300">Completed Date</th>
                  <th className="py-3 px-3 w-[190px] min-w-[180px] text-left">Status</th>
                  <th className="py-3 px-3.5 min-w-[260px] w-[290px] text-maple-300">
                    Feedback / Comments & <span className="text-amber-400 font-bold">WPI Reason</span>
                  </th>
                  <th className="py-3 px-3.5 min-w-[150px] w-[170px]">
                    <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span>Blockers</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </div>
                  </th>
                  <th className="py-3 px-2 w-10 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {taskRows.map((row, idx) => {
                  const isWpi = row.status === 'wpi';
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isWpi ? 'bg-amber-950/15' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold text-xs align-top pt-4">
                        {idx + 1}
                      </td>

                      {/* Project Name */}
                      <td className="py-3 px-3.5 align-top">
                        <input
                          type="text"
                          value={row.projectName}
                          onChange={(e) => handleUpdateRow(row.id, 'projectName', e.target.value)}
                          placeholder="e.g. MapleBot, LXD..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs font-medium"
                          required
                        />
                      </td>

                      {/* Task Deliverable Description */}
                      <td className="py-3 px-3.5 min-w-[380px] w-[400px] align-top">
                        {row.isCarriedForward && (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <RefreshCw className="w-3 h-3" /> Carried Forward from {row.carriedFromDate || 'previous day'}
                            </span>
                            {row.carriedFromReason && (
                              <span className="text-[11px] text-slate-400 italic">
                                Previous Note: "{row.carriedFromReason}"
                              </span>
                            )}
                          </div>
                        )}
                        <textarea
                          rows={3}
                          value={row.task}
                          onChange={(e) => handleUpdateRow(row.id, 'task', e.target.value)}
                          placeholder={`Task ${idx + 1}: Detailed description of deliverable...`}
                          className="w-full min-w-[360px] px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs font-medium leading-relaxed resize-y min-h-[76px]"
                          required
                        />
                      </td>

                      {/* Assigned Date */}
                      <td className="py-3 px-3 align-top">
                        <input
                          type="date"
                          value={row.assignedDate}
                          onChange={(e) => handleUpdateRow(row.id, 'assignedDate', e.target.value)}
                          className="w-full px-2 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:border-maple-500 text-xs cursor-pointer font-medium"
                          required
                        />
                      </td>

                      {/* Estimated Time */}
                      <td className="py-3 px-2.5 w-[110px] min-w-[105px] text-left align-top">
                        <div className="space-y-1">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="24"
                              value={row.estimatedHours === undefined || row.estimatedHours === 0 ? '' : row.estimatedHours}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                handleUpdateRow(row.id, 'estimatedHours', isNaN(v as number) ? undefined : v);
                              }}
                              placeholder="e.g. 2"
                              className="w-full pr-7 pl-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-2 text-[10px] text-slate-400 font-medium pointer-events-none">hrs</span>
                          </div>
                          {row.estimatedTimeMinutes && row.estimatedTimeMinutes > 0 ? (
                            <span className="text-[10px] font-mono text-amber-400/90 block truncate" title={`${row.estimatedTimeMinutes} minutes`}>
                              ⏱️ {formatMinutesToFriendly(row.estimatedTimeMinutes)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Actual Time Taken */}
                      <td className="py-3 px-2.5 w-[125px] min-w-[120px] text-left align-top">
                        {!isCheckedIn ? (
                          <div className="px-2 py-2 bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-500 font-mono text-[11px] italic select-none" title="Unlocked after morning check-in">
                            — After checkin
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max="24"
                                value={row.timeInvested === 0 ? '' : row.timeInvested}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  handleUpdateRow(row.id, 'timeInvested', isNaN(v) ? 0 : v);
                                }}
                                placeholder="e.g. 2"
                                className="w-full pr-7 pl-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sky-400 font-mono font-bold text-xs focus:outline-none focus:border-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="absolute right-2 text-[10px] text-slate-400 font-medium pointer-events-none">hrs</span>
                            </div>
                            {/* Friendly minutes preview */}
                            {row.actualTimeMinutes && row.actualTimeMinutes > 0 ? (
                              <span className="text-[10px] font-mono text-sky-400/90 block truncate" title={`${row.actualTimeMinutes} minutes`}>
                                ⏱️ {formatMinutesToFriendly(row.actualTimeMinutes)}
                              </span>
                            ) : null}
                            {/* Variance Comparison Badge */}
                            {row.estimatedTimeMinutes && row.estimatedTimeMinutes > 0 && row.actualTimeMinutes && row.actualTimeMinutes > 0 && (() => {
                              const diff = row.actualTimeMinutes - row.estimatedTimeMinutes;
                              if (diff === 0) {
                                return (
                                  <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    ✓ On target
                                  </span>
                                );
                              }
                              if (diff > 0) {
                                return (
                                  <span className="inline-block text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    +{formatMinutesToFriendly(diff)} over
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-block text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                  -{formatMinutesToFriendly(Math.abs(diff))} saved
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </td>

                      {/* Units */}
                      <td className="py-3 px-3 text-left align-top">
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
                            className="w-full pr-10 pl-2 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-purple-300 font-mono font-bold text-xs focus:outline-none focus:border-maple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            required
                          />
                          <span className="absolute right-2 text-[10px] text-slate-400 font-medium pointer-events-none">items</span>
                        </div>
                      </td>

                      {/* Completed Date */}
                      <td className="py-3 px-3 align-top">
                        <input
                          type="date"
                          value={row.completedDate}
                          onChange={(e) => handleUpdateRow(row.id, 'completedDate', e.target.value)}
                          className="w-full px-2 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sky-300 font-medium focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                          required
                        />
                      </td>

                      {/* Status: Planned (WIP) during initial morning entry, then Enabled dropdown */}
                      <td className="py-3 px-3 w-[190px] min-w-[180px] align-top">
                        {!isCheckedIn ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold select-none" title="Planned during morning entry (activates upon check-in)">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>⏳ Planned (WIP)</span>
                          </div>
                        ) : (
                          <select
                            value={row.status}
                            onChange={(e) => handleUpdateRow(row.id, 'status', e.target.value as ActionItemStatus)}
                            className={`w-full px-2.5 py-2 rounded-lg font-bold text-xs focus:outline-none cursor-pointer border ${
                              row.status === 'completed'
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50'
                                : 'bg-amber-950/40 text-amber-300 border-amber-500/50'
                            }`}
                          >
                            <option value="wpi">⏳ Work in Progress (WPI)</option>
                            <option value="completed">✅ Completed</option>
                          </select>
                        )}
                      </td>

                      {/* Feedback / Comments & WPI Reason */}
                      <td className="py-3 px-3.5 min-w-[260px] w-[290px] align-top">
                        {isWpi ? (
                          <div className="space-y-1">
                            <textarea
                              rows={3}
                              value={row.wpiReason || row.feedbackComments}
                              onChange={(e) => {
                                handleUpdateRow(row.id, 'wpiReason', e.target.value);
                                handleUpdateRow(row.id, 'feedbackComments', e.target.value);
                              }}
                              placeholder="Required: Why still in progress & tomorrow's continuation plan? (Mandatory for WPI)"
                              className="w-full min-w-[250px] px-3 py-2 bg-amber-950/20 border-2 border-amber-500/70 rounded-lg text-amber-200 placeholder-amber-400/50 focus:outline-none focus:border-amber-400 text-xs font-medium leading-relaxed resize-y min-h-[76px]"
                              required
                            />
                            <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Mandatory for WPI (carries forward)
                            </span>
                          </div>
                        ) : (
                          <textarea
                            rows={3}
                            value={row.feedbackComments}
                            onChange={(e) => handleUpdateRow(row.id, 'feedbackComments', e.target.value)}
                            placeholder="Task feedback / comments..."
                            className="w-full min-w-[250px] px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs font-medium leading-relaxed resize-y min-h-[76px]"
                          />
                        )}
                      </td>

                      {/* Blockers (Optional) */}
                      <td className="py-3 px-3.5 min-w-[150px] w-[170px] align-top">
                        <input
                          type="text"
                          value={row.blocker}
                          onChange={(e) => handleUpdateRow(row.id, 'blocker', e.target.value)}
                          placeholder="Any impediment..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-rose-300 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs font-medium"
                        />
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-2 text-center align-top pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={taskRows.length <= 1}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER CONTROLS & WORKFLOW ACTIONS */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            {/* Inline Footer Error or Success Notice */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
                >
                  Dismiss
                </button>
              </div>
            )}

            {successNotice && (
              <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{successNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessNotice('')}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Row controls & live totals */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddRow}
                  leftIcon={<Plus className="w-4 h-4 text-maple-400" />}
                >
                  Add Task Row
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasteModalOpen(true)}
                  leftIcon={<ClipboardList className="w-4 h-4 text-sky-400" />}
                >
                  Paste from Chat
                </Button>

                <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Total: </span>
                    <span className="font-bold text-white font-mono">{taskRows.length} tasks</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Est. Time: </span>
                    <span className="font-bold text-amber-400 font-mono">{totalEstimatedHours}h</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Actual: </span>
                    <span className="font-bold text-sky-400 font-mono">{totalHours}h</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Completed: </span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {taskRows.filter((r) => r.status === 'completed').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">WPI: </span>
                    <span className="font-bold text-amber-400 font-mono">
                      {taskRows.filter((r) => r.status === 'wpi').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: The 3 Workflow Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Morning Check-in / Login Button */}
                <Button
                  type="button"
                  variant={isCheckedIn ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleMorningCheckin}
                  disabled={isSubmitting}
                  className={
                    isCheckedIn
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-amber-500/60 text-amber-300 hover:bg-amber-500/10 shadow-sm'
                  }
                  leftIcon={<Sun className="w-4 h-4 text-amber-400" />}
                >
                  {isCheckedIn ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Check-in ({dailySession?.checkin_time || 'Done'})
                    </span>
                  ) : (
                    `🌅 Morning Check-in (${customCheckinTime || liveIstTime})`
                  )}
                </Button>

                {/* 2. Save Progress Draft Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveProgress}
                  disabled={isSubmitting}
                  leftIcon={<Save className="w-4 h-4 text-purple-400" />}
                >
                  💾 Save Draft
                </Button>

                {/* 3. Evening Check-out / Logout Button */}
                {isCheckedOut ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Checked Out ({dailySession?.checkout_time})
                  </span>
                ) : isCheckedIn ? (
                  !isEveningCheckoutAllowed ? (
                    <button
                      type="button"
                      disabled
                      className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-80 shadow-sm"
                      title="Evening checkout is available starting at 3:00 PM IST (or for past dates)"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>🔒 Evening Checkout (Available at 3:00 PM IST)</span>
                    </button>
                  ) : (
                    <GradientButton
                      type="button"
                      size="sm"
                      onClick={handleEveningCheckout}
                      disabled={isSubmitting}
                      leftIcon={<Moon className="w-4 h-4" />}
                    >
                      {isSubmitting ? 'Checking out...' : `🚀 Evening Check-out (${dailySession?.checkout_time || liveIstTime})`}
                    </GradientButton>
                  )
                ) : null /* Hidden during morning before check-in */}
              </div>
            </div>
          </div>
        </div>
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
              <table className="w-full text-left text-xs border-collapse min-w-[1550px]">
                <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  <tr>
                    {ledgerMode === 'team' && isPrivileged && (
                      <th className="py-3 px-3.5 whitespace-nowrap min-w-[160px]">Team Member</th>
                    )}
                    <th className="py-3 px-3.5 whitespace-nowrap">Date & Check-in Time</th>
                    <th className="py-3 px-3.5 whitespace-nowrap min-w-[160px]">Project</th>
                    <th className="py-3 px-3.5 min-w-[380px]">Task Deliverable</th>
                    <th className="py-3 px-3.5 text-left whitespace-nowrap">Hours</th>
                    <th className="py-3 px-3.5 text-left whitespace-nowrap">Deliverables</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-sky-300">Completed Date</th>
                    <th className="py-3 px-3.5 min-w-[240px] text-maple-300">Member Feedback</th>
                    <th className="py-3 px-3.5 min-w-[240px] text-emerald-300">Reviewer Comments</th>
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

                      {/* Date, Check-in & Check-out Time */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        <span className="font-mono text-xs text-white block font-bold">{row.checkin_date || row.date}</span>
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            In: {row.checkin_time || row.submission_time || '10:00 AM'}
                          </span>
                          {row.checkout_time && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-mono font-semibold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              <Moon className="w-3 h-3 text-sky-400" />
                              Out: {row.checkout_time}
                            </span>
                          )}
                        </div>
                        {row.work_date && row.work_date !== (row.checkin_date || row.date) && (
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5" title="Work Performance Date">
                            Work: {row.work_date}
                          </span>
                        )}
                      </td>

                      {/* Project */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top min-w-[160px]">
                        <span className="text-xs font-semibold text-slate-200 block">
                          {row.project_name || row.project || 'General'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{row.category || 'Development'}</span>
                      </td>

                      {/* Task Deliverable */}
                      <td className="py-3 px-3.5 align-top min-w-[380px]">
                        {row.is_carried_forward && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                            <RefreshCw className="w-3 h-3" /> Carried Forward from {row.carried_from_date || 'previous day'}
                          </span>
                        )}
                        <span className="font-medium text-slate-100 block text-xs leading-relaxed break-words">
                          {row.task || row.task_title}
                        </span>
                        {/* Delivery Status Badge */}
                        <div className="mt-1.5 flex items-center gap-2">
                          {row.status === 'completed' || row.delivery_status?.startsWith('completed') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                              ✅ Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                              ⏳ Work in Progress (WPI)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hours */}
                      <td className="py-3 px-3.5 text-left font-mono whitespace-nowrap align-top text-xs">
                        <div className="space-y-1">
                          <span className="text-sky-400 font-bold block">
                            {row.actual_time_minutes
                              ? formatMinutesToFriendly(row.actual_time_minutes)
                              : `${row.time_invested || row.duration_hours || 0}h`}
                          </span>
                          {row.estimated_time_minutes && row.estimated_time_minutes > 0 ? (
                            <span className="text-[10px] text-amber-400/90 block font-normal" title={`Estimated: ${row.estimated_time_minutes}m`}>
                              Est: {formatMinutesToFriendly(row.estimated_time_minutes)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Deliverables */}
                      <td className="py-3 px-3.5 text-left font-mono text-purple-300 font-bold whitespace-nowrap align-top text-xs">
                        {row.unit_count_completed || 1} items
                      </td>

                      {/* Completed Date (Member Single Source of Truth) */}
                      <td className="py-3 px-3.5 font-mono text-xs text-sky-300 whitespace-nowrap align-top">
                        {row.completed_date || row.review_assigned_date || row.date}
                      </td>

                      {/* Member Feedback & WPI Reason */}
                      <td className="py-3 px-3.5 text-slate-300 text-xs align-top">
                        {row.wpi_reason || (row.status === 'in_progress' && (row.feedback_comments || row.comments)) ? (
                          <div className="bg-amber-950/25 p-2 rounded-lg border border-amber-800/50 text-amber-200 text-[11px] leading-relaxed">
                            <span className="font-bold text-amber-400 block mb-0.5 text-[10px] uppercase">
                              📌 WPI Explanation:
                            </span>
                            {row.wpi_reason || row.feedback_comments || row.comments}
                          </div>
                        ) : row.feedback_comments ? (
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
      {/* Quick Paste from Google Chat / Notes Modal */}
      <Modal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        title="Paste Tasks from Google Chat or Notes"
        subtitle="Paste lines of tasks or Google Chat messages. They will automatically be parsed into deliverable rows."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Paste Raw Task Lines (e.g. from Google Chat)
            </label>
            <textarea
              rows={8}
              value={pastedChatText}
              onChange={(e) => setPastedChatText(e.target.value)}
              placeholder="e.g.&#10;1. Custom eLearning Page: Continue redesigning the page — 2 hrs&#10;2. Article Publishing: Publish article on Medium — 1 hr&#10;3. SEO Updates: Added meta titles to pages — 2.5 hrs"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Supports formats with project names, bullet points, numbers, and duration (e.g. "— 2 hrs", "(1.5h)").
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPasteModalOpen(false)}
            >
              Cancel
            </Button>
            <GradientButton
              type="button"
              size="sm"
              onClick={handleParseAndApplyPaste}
              disabled={!pastedChatText.trim()}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Parse & Populate Table
            </GradientButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
