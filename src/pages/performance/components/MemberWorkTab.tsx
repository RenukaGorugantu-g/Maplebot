// ==============================================================================
// MapleBot: Pod Member Multi-Task Work Performance Table
// Direct Multi-Row Spreadsheet Table: Log 3-4 Tasks/day with Deliverables Count
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { googleChatService } from '../../../services/googleChatService';
import { PerformanceWorkLog, WorkCategory, WorkPriority } from '../../../types/performance';
import { Button, GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
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
} from 'lucide-react';

interface TaskDraftRow {
  id: string;
  projectName: string;
  category: WorkCategory;
  task: string;
  assignedDate: string;
  timeInvested: number;
  unitCountCompleted: number; // Deliverables count (e.g. 1 feature, 3 pages, 5 leads)
  reviewAssignedDate: string;
  comments: string;
}

export const MemberWorkTab: React.FC = () => {
  const { profile } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const getFormattedTime = () => {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Work Date & Check-in / Submission Time (Auto-captured, read-only)
  const [workDate] = useState<string>(todayStr);
  const [checkinTime, setCheckinTime] = useState<string>(getFormattedTime());

  // Keep live time updated
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCheckinTime(getFormattedTime());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Multi-task draft rows state (Starts with 1 mandatory task row; members can add 2, 3, 4+ as needed)
  const [taskRows, setTaskRows] = useState<TaskDraftRow[]>([
    {
      id: 'row-1',
      projectName: 'LXD Marketplace',
      category: 'Development',
      task: '',
      assignedDate: todayStr,
      timeInvested: 4.0,
      unitCountCompleted: 1,
      reviewAssignedDate: todayStr,
      comments: '',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add new task row (Allows adding 2nd, 3rd, 4th, or more tasks as per member's wish)
  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    setTaskRows((prev) => [
      ...prev,
      {
        id: newId,
        projectName: prev[prev.length - 1]?.projectName || 'LXD Marketplace',
        category: 'Development',
        task: '',
        assignedDate: workDate,
        timeInvested: 2.0,
        unitCountCompleted: 1,
        reviewAssignedDate: workDate,
        comments: '',
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

    // Validation: ensure filled tasks
    const validRows = taskRows.filter((r) => r.task.trim().length > 0);
    if (validRows.length === 0) {
      setErrorMsg('Please describe at least one task deliverable before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      validRows.forEach((r) => {
        dataStore.submitMemberWork({
          employee_id: profile?.id || 'prof-sample-member',
          employee_name: profile?.full_name || 'Harshika Netha (Pod Member)',
          date: workDate,
          submission_time: checkinTime,
          checkin_time: checkinTime,
          project_name: r.projectName.trim() || 'General',
          project: r.projectName.trim() || 'General',
          task: r.task.trim(),
          task_title: r.task.trim(),
          assigned_date: r.assignedDate || workDate,
          time_invested: Number(r.timeInvested) || 1.0,
          duration_hours: Number(r.timeInvested) || 1.0,
          unit_count_completed: Number(r.unitCountCompleted) || 1,
          review_assigned_date: r.reviewAssignedDate || workDate,
          comments: r.comments.trim(),
          category: r.category || 'Development',
          priority: 'medium',
        });
      });

      // Dispatch high-level summary overview to Google Chat (excluding internal granular comments)
      const memberPod = profile?.pod_id ? dataStore.getPodById(profile.pod_id) : undefined;
      googleChatService.sendWorkDeliverablesSummaryCard({
        memberName: profile?.full_name || 'Team Member',
        podName: memberPod?.name || 'General Pod',
        date: workDate,
        checkinTime: checkinTime,
        tasks: validRows.map((r) => ({
          projectName: r.projectName.trim() || 'General',
          task: r.task.trim(),
          timeInvested: Number(r.timeInvested) || 1.0,
          unitCountCompleted: Number(r.unitCountCompleted) || 1,
          comments: r.comments.trim(),
        })),
      }).catch((err) => console.warn('GChat summary notice:', err));

      setSuccessNotice(`🎉 Fantastic work! Successfully submitted ${validRows.length} task deliverable(s) for ${workDate} at ${checkinTime}! High-level overview dispatched to Google Chat and assigned to Pod Lead for review.`);
      setTimeout(() => setSuccessNotice(''), 7000);

      // Reset empty rows
      setTaskRows([
        {
          id: `row-${Date.now()}-1`,
          projectName: 'LXD Marketplace',
          category: 'Development',
          task: '',
          assignedDate: workDate,
          timeInvested: 4.0,
          unitCountCompleted: 1,
          reviewAssignedDate: workDate,
          comments: '',
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit work updates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Query member's own logs for history ledger
  const memberLogs = useMemo(() => {
    if (!profile?.id) return [];
    return dataStore.getPerformanceWorkLogs({
      employeeId: profile.id,
    });
  }, [profile?.id, isSubmitting]);

  const filteredLogs = useMemo(() => {
    return memberLogs.filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.task.toLowerCase().includes(q) ||
        l.project_name.toLowerCase().includes(q) ||
        (l.comments && l.comments.toLowerCase().includes(q))
      );
    });
  }, [memberLogs, searchQuery]);

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
              Log Today's Work Tasks & Deliverables
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Fill in the tasks you worked on today (3-4 tasks or more), specify hours, deliverables, and check-in time, then submit all at once for Pod Lead review.
            </p>
          </div>

          {/* Date, Check-in Time & Member Badge (Read-Only to prevent tampering) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Badge (Non-Editable, White Calendar Icon) */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-sm shadow-sm select-none">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-slate-400 font-medium">Date:</span>
              <span className="text-white font-mono font-bold">{workDate}</span>
            </div>

            {/* Check-in / Submission Time (Non-Editable) */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-sm shadow-sm select-none">
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

        {/* THE EDITABLE MULTI-TASK TABLE GRID (Full Width, No Horizontal Scrolling) */}
        <form onSubmit={handleSubmitAll} className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-[#060E1A] shadow-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  <th className="py-2.5 px-2 w-8 text-center text-slate-500">#</th>
                  <th className="py-2.5 px-2 w-[15%]">Project Name</th>
                  <th className="py-2.5 px-2 w-[32%]">Task Deliverable (Specific activity)</th>
                  <th className="py-2.5 px-2 w-[110px]">Assigned Date</th>
                  <th className="py-2.5 px-2 w-[75px] text-left">Hours</th>
                  <th className="py-2.5 px-2 w-[90px] text-left">
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
                  <th className="py-2.5 px-2 w-[110px]">Review Date</th>
                  <th className="py-2.5 px-2 w-[16%]">Comments / Blocker</th>
                  <th className="py-2.5 px-2 w-8 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {taskRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Index */}
                    <td className="py-2 px-2 text-center font-mono text-slate-400 font-bold text-xs">
                      {idx + 1}
                    </td>

                    {/* Project Name */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.projectName}
                        onChange={(e) => handleUpdateRow(row.id, 'projectName', e.target.value)}
                        placeholder="e.g. LXD Marketplace"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs font-medium"
                        required
                      />
                    </td>

                    {/* Task Description */}
                    <td className="py-2 px-2">
                      <textarea
                        rows={2}
                        value={row.task}
                        onChange={(e) => handleUpdateRow(row.id, 'task', e.target.value)}
                        placeholder={`Task ${idx + 1}: Detailed description of what you completed...`}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs resize-none font-medium leading-relaxed"
                        required
                      />
                    </td>

                    {/* Assigned Date */}
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={row.assignedDate}
                        onChange={(e) => handleUpdateRow(row.id, 'assignedDate', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-maple-500 text-xs cursor-pointer font-medium"
                        required
                      />
                    </td>

                    {/* Hours Invested - Left Aligned, Free Number Entry */}
                    <td className="py-2 px-2 text-left">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        max="24"
                        value={row.timeInvested === 0 ? '' : row.timeInvested}
                        onChange={(e) => {
                          const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleUpdateRow(row.id, 'timeInvested', v);
                        }}
                        placeholder="4.0"
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sky-400 font-mono font-bold text-left focus:outline-none focus:border-maple-500 text-xs"
                        required
                      />
                    </td>

                    {/* Deliverables Count - Left Aligned, Free Number Entry */}
                    <td className="py-2 px-2 text-left">
                      <div className="flex items-center gap-1.5">
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
                          className="w-12 px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-purple-300 font-mono font-bold text-left focus:outline-none focus:border-maple-500 text-xs"
                          required
                        />
                        <span className="text-[11px] text-slate-400 font-medium">items</span>
                      </div>
                    </td>

                    {/* Review Assigned Date */}
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={row.reviewAssignedDate}
                        onChange={(e) => handleUpdateRow(row.id, 'reviewAssignedDate', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-maple-500 text-xs cursor-pointer font-medium"
                        required
                      />
                    </td>

                    {/* Comments */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.comments}
                        onChange={(e) => handleUpdateRow(row.id, 'comments', e.target.value)}
                        placeholder="Notes, blocker..."
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-maple-500 text-xs font-medium"
                      />
                    </td>

                    {/* Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete task row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {/* 2. SUBMITTED WORK HISTORY LEDGER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-maple-400" />
              My Submitted Tasks Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Previously submitted tasks, review status from Pod Lead, and quality evaluations from Manager.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previous tasks..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
            />
          </div>
        </div>

        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
          {filteredLogs.length === 0 ? (
            <div className="p-10">
              <EmptyState
                title="No submitted tasks yet"
                description="Use the multi-task table above to log and submit your daily deliverables."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#0B1728] border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <tr>
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Date & Check-in Time</th>
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Project Name</th>
                    <th className="py-3.5 px-3.5 min-w-[260px]">Task</th>
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Assigned Date</th>
                    <th className="py-3.5 px-3.5 text-left whitespace-nowrap">Hours</th>
                    <th className="py-3.5 px-3.5 text-left whitespace-nowrap">Deliverables</th>
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Review Assigned Date</th>
                    <th className="py-3.5 px-3.5 min-w-[200px]">Comments</th>
                    <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Workflow Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3.5 whitespace-nowrap align-top">
                        <span className="font-mono text-xs text-white block font-bold">{row.date}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mt-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          {row.submission_time || row.checkin_time || '10:00 AM'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 font-bold text-white whitespace-nowrap align-top">
                        {row.project_name || row.project}
                      </td>
                      <td className="py-3.5 px-3.5 align-top">
                        <span className="font-medium text-slate-100 block text-sm leading-relaxed">{row.task || row.task_title}</span>
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-xs text-slate-300 whitespace-nowrap align-top">
                        {row.assigned_date || row.date}
                      </td>
                      <td className="py-3.5 px-3.5 text-left font-mono text-sky-400 font-bold whitespace-nowrap align-top text-sm">
                        {row.time_invested || row.duration_hours}h
                      </td>
                      <td className="py-3.5 px-3.5 text-left font-mono text-purple-300 font-bold whitespace-nowrap align-top text-sm">
                        {row.unit_count_completed || 1} items
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-xs text-slate-300 whitespace-nowrap align-top">
                        {row.review_assigned_date || row.date}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-300 text-xs align-top">
                        {row.comments || <span className="text-slate-600 italic">—</span>}
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap align-top">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
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
