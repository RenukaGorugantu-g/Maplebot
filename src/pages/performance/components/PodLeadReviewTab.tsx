// ==============================================================================
// MapleBot: Pod Lead Work Review & Own Deliverables Tab
// 1. Pod Review: Inspect Member 9 fields & add 5 Review Fields
// 2. Pod Lead Own Work: Complete 17-field entry
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { PerformanceWorkLog, WorkCategory, WorkPriority } from '../../../types/performance';
import { googleChatService } from '../../../services/googleChatService';
import { Modal } from '../../../components/ui/Modal';
import { Button, GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  CheckSquare,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  User,
  Layers,
  Save,
  Edit2,
  Send,
} from 'lucide-react';

export const PodLeadReviewTab: React.FC = () => {
  const { profile, userPod } = useAuth();
  const [subView, setSubView] = useState<'review_queue' | 'own_work'>('review_queue');

  // Review Modal State (Adding the 5 Pod Lead Fields)
  const [reviewingLog, setReviewingLog] = useState<PerformanceWorkLog | null>(null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<string>('');
  const [completedDate, setCompletedDate] = useState<string>('');
  const [reviewCompletedDate, setReviewCompletedDate] = useState<string>('');
  const [reviewer, setReviewer] = useState<string>(profile?.full_name || 'Pod Lead');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string>('');

  // Own Work Modal State (Full 17 fields)
  const [isOwnWorkModalOpen, setIsOwnWorkModalOpen] = useState<boolean>(false);
  const [ownDate, setOwnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ownProject, setOwnProject] = useState<string>('LXD Marketplace');
  const [ownTask, setOwnTask] = useState<string>('');
  const [ownAssignedDate, setOwnAssignedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ownExpectedDate, setOwnExpectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ownCompletedDate, setOwnCompletedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ownTime, setOwnTime] = useState<number>(6.0);
  const [ownUnits, setOwnUnits] = useState<number>(1);
  const [ownRevAssigned, setOwnRevAssigned] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ownRevCompleted, setOwnRevCompleted] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ownReviewer, setOwnReviewer] = useState<string>('Sandeep Guntupalli');
  const [ownError, setOwnError] = useState<number>(0);
  const [ownComments, setOwnComments] = useState<string>('');
  const [ownCategory, setOwnCategory] = useState<WorkCategory>('Development');
  const [ownPriority, setOwnPriority] = useState<WorkPriority>('high');

  const [reviewComments, setReviewComments] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  const podId = profile?.pod_id || userPod?.id || 'pod-web-sales';

  // Retrieve submitted pod logs (including both team members and pod lead's own submissions)
  const podMemberLogs = useMemo(() => {
    return dataStore.getPerformanceWorkLogs({ podId });
  }, [podId, profile?.id, reviewingLog, isSavingReview]);

  // Retrieve lead's own logs
  const leadOwnLogs = useMemo(() => {
    return dataStore.getPerformanceWorkLogs({ employeeId: profile?.id });
  }, [profile?.id, isOwnWorkModalOpen, isSavingReview]);

  const activeList = subView === 'review_queue' ? podMemberLogs : leadOwnLogs;
  const filteredList = useMemo(() => {
    return activeList.filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.task && l.task.toLowerCase().includes(q)) ||
        (l.employee_name && l.employee_name.toLowerCase().includes(q)) ||
        (l.project_name && l.project_name.toLowerCase().includes(q))
      );
    });
  }, [activeList, searchQuery]);

  const openReviewModal = (log: PerformanceWorkLog) => {
    setReviewingLog(log);
    const today = new Date().toISOString().split('T')[0];
    setExpectedCompletionDate(log.expected_completion_date || log.assigned_date || today);
    setCompletedDate(log.completed_date || today);
    setReviewCompletedDate(log.review_completed_date || today);
    setReviewer(log.reviewer || profile?.full_name || 'Pod Lead');
    setErrorCount(log.error_count ?? 0);
    setReviewComments(log.comments || '');
    setReviewErrorMsg('');
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingLog) return;
    if (!expectedCompletionDate || !completedDate || !reviewCompletedDate || !reviewer.trim()) {
      setReviewErrorMsg('Please fill in all 5 review fields.');
      return;
    }

    setIsSavingReview(true);
    setReviewErrorMsg('');

    try {
      const updated = dataStore.savePodLeadReview(reviewingLog.id, {
        expected_completion_date: expectedCompletionDate,
        completed_date: completedDate,
        review_completed_date: reviewCompletedDate,
        reviewer: reviewer.trim(),
        error_count: Number(errorCount),
      });

      if (updated && reviewComments.trim() !== (reviewingLog.comments || '')) {
        dataStore.updatePerformanceWorkLog(reviewingLog.id, {
          comments: reviewComments.trim(),
        });
      }

      if (updated) {
        const finalComments = reviewComments.trim() || updated.comments || 'Deliverable verified and advanced to manager review.';
        googleChatService.sendReviewEvaluationCard({
          log: { ...updated, comments: finalComments },
          reviewerName: reviewer.trim() || profile?.full_name || 'Pod Lead',
          reviewerRole: 'Pod Lead',
          errorCount: Number(errorCount),
          comments: finalComments,
        });
      }

      setSuccessNotice(`Review saved for ${reviewingLog.employee_name}. Record advanced to Manager Review & synced to team chat.`);
      setTimeout(() => setSuccessNotice(''), 4000);
      setReviewingLog(null);
    } catch (err: any) {
      setReviewErrorMsg(err.message || 'Failed to save review.');
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleSaveOwnWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownTask.trim() || !ownProject.trim()) return;

    dataStore.savePodLeadOwnWork({
      date: ownDate,
      project_name: ownProject.trim(),
      task: ownTask.trim(),
      assigned_date: ownAssignedDate,
      expected_completion_date: ownExpectedDate,
      completed_date: ownCompletedDate,
      time_invested: Number(ownTime),
      unit_count_completed: Number(ownUnits),
      review_assigned_date: ownRevAssigned,
      review_completed_date: ownRevCompleted,
      reviewer: ownReviewer.trim(),
      error_count: Number(ownError),
      comments: ownComments.trim(),
      category: ownCategory,
      priority: ownPriority,
    });

    setSuccessNotice('Pod Lead work deliverable saved successfully.');
    setTimeout(() => setSuccessNotice(''), 4000);
    setIsOwnWorkModalOpen(false);
    setOwnTask('');
    setOwnComments('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Switcher & Action Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400">
              {userPod?.name || 'Web & Sales'} Pod Lead Cockpit
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {subView === 'review_queue' ? 'Pod Member Work Review Queue' : 'Pod Lead Own Work Updates'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {subView === 'review_queue'
              ? 'Inspect submitted deliverables from your Pod Members and append the 5 review verification fields.'
              : 'Log and track your own technical and departmental initiatives.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-view switcher */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSubView('review_queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subView === 'review_queue'
                  ? 'bg-maple-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pod Review Queue ({podMemberLogs.length})
            </button>
            <button
              onClick={() => setSubView('own_work')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subView === 'own_work'
                  ? 'bg-maple-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Own Work ({leadOwnLogs.length})
            </button>
          </div>

          {subView === 'own_work' && (
            <GradientButton
              size="sm"
              onClick={() => setIsOwnWorkModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Log Lead Deliverable
            </GradientButton>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successNotice}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="glass-card p-4 border border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, members, or projects..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <strong>{filteredList.length}</strong> records
        </div>
      </div>

      {/* 1. REVIEW QUEUE TABLE (Member Data + Pod Lead 5 Fields) */}
      {subView === 'review_queue' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
          {filteredList.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="Review Queue Clear"
                description="No pending work submissions from your pod members."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">Member</th>
                    <th className="py-3 px-3 whitespace-nowrap">Date & Check-in Time</th>
                    <th className="py-3 px-3 whitespace-nowrap">Project</th>
                    <th className="py-3 px-3 min-w-[200px]">Task Deliverable</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap">Hours</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap" title="Quantity of finished items: e.g. 1 feature, 3 pages, 5 leads">Deliverables</th>
                    {/* POD LEAD 5 FIELDS */}
                    <th className="py-3 px-3 whitespace-nowrap text-maple-300">Expected Date</th>
                    <th className="py-3 px-3 whitespace-nowrap text-maple-300">Completed Date</th>
                    <th className="py-3 px-3 whitespace-nowrap text-maple-300">Review Completed</th>
                    <th className="py-3 px-3 whitespace-nowrap text-maple-300">Reviewer</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap text-maple-300">Errors</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredList.map((row) => {
                    const isReviewed = row.workflow_status === 'pod_lead_reviewed' || row.workflow_status === 'manager_reviewed';
                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white whitespace-nowrap align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{row.employee_name}</span>
                            {row.employee_id === profile?.id && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-maple-500/20 text-maple-300 border border-maple-500/30 font-bold">
                                You (Pod Lead)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span className="font-mono text-[11px] text-white block font-bold">{row.date}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mt-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {row.submission_time || row.checkin_time || '10:00 AM'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-300 whitespace-nowrap align-top">
                          {row.project_name || row.project}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span className="font-medium text-slate-100 block">{row.task || row.task_title}</span>
                          {row.comments && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">{row.comments}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left font-mono text-sky-400 font-bold whitespace-nowrap align-top">
                          {row.time_invested || row.duration_hours}h
                        </td>
                        <td className="py-3 px-3 text-left font-mono text-purple-300 font-bold whitespace-nowrap align-top">
                          {row.unit_count_completed || 0} items
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap align-top">
                          {row.expected_completion_date || <span className="text-amber-400 italic">Pending</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap align-top">
                          {row.completed_date || <span className="text-amber-400 italic">Pending</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap align-top">
                          {row.review_completed_date || <span className="text-amber-400 italic">Pending</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap align-top text-[11px]">
                          {row.reviewer || row.reviewer_name || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-300 font-bold whitespace-nowrap align-top">
                          {row.error_count ?? 0}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isReviewed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {isReviewed ? 'Reviewed' : 'Needs Review'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openReviewModal(row)}
                            leftIcon={<FileCheck className="w-3.5 h-3.5 text-maple-400" />}
                          >
                            {isReviewed ? 'Edit' : 'Review'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. POD LEAD'S OWN WORK TABLE */}
      {subView === 'own_work' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
          {filteredList.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No Own Work Logged"
                description="Click 'Log Lead Deliverable' above to record your deliverables."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">Project</th>
                    <th className="py-3 px-3 min-w-[220px]">Task</th>
                    <th className="py-3 px-3 whitespace-nowrap">Assigned</th>
                    <th className="py-3 px-3 whitespace-nowrap">Completed</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Hours</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Units</th>
                    <th className="py-3 px-3 whitespace-nowrap">Reviewer</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredList.map((row) => {
                    const isReviewed = row.workflow_status === 'pod_lead_reviewed' || row.workflow_status === 'manager_reviewed';
                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap align-top">
                          {row.date}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white whitespace-nowrap align-top">
                          {row.project_name || row.project}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span className="font-medium text-slate-100 block">{row.task || row.task_title}</span>
                          {row.comments && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">{row.comments}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap align-top">
                          {row.assigned_date}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap align-top">
                          {row.completed_date || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sky-400 font-bold whitespace-nowrap align-top">
                          {row.time_invested || row.duration_hours}h
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-300 font-bold whitespace-nowrap align-top">
                          {row.unit_count_completed || 0}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap align-top text-[11px]">
                          {row.reviewer || 'Pod Lead'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isReviewed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {isReviewed ? 'Reviewed' : 'Needs Review'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openReviewModal(row)}
                            leftIcon={<FileCheck className="w-3.5 h-3.5 text-maple-400" />}
                          >
                            {isReviewed ? 'Edit Review' : 'Review 5 Fields'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 1. POD LEAD REVIEW MODAL (WIDE 2-COLUMN 4XL WORKSTATION) */}
      {reviewingLog && (
        <Modal
          isOpen={!!reviewingLog}
          onClose={() => setReviewingLog(null)}
          title={`Pod Lead Deliverable Review — ${reviewingLog.employee_name}`}
          subtitle="Verify deliverable completion dates, reviewer allocation, audit error count, and add comments."
          maxWidth="4xl"
        >
          <form onSubmit={handleSaveReview} className="space-y-6 text-xs">
            {reviewErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{reviewErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN (5 Cols): Preserved Member Task Info */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-[#081426] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Deliverable Context
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">ID: {reviewingLog.id.slice(-6)}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Team Member</span>
                      <span className="font-semibold text-white text-xs">{reviewingLog.employee_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Date</span>
                        <span className="font-mono text-slate-200 text-xs">{reviewingLog.date}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Check-in Time</span>
                        <span className="font-mono text-emerald-400 text-xs font-semibold">
                          {reviewingLog.submission_time || reviewingLog.checkin_time || '10:00 AM'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Project</span>
                      <span className="font-medium text-slate-200 text-xs">{reviewingLog.project_name || reviewingLog.project}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Task Deliverable</span>
                      <p className="text-slate-200 text-xs font-medium bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 mt-1">
                        {reviewingLog.task || reviewingLog.task_title}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Hours Spent</span>
                        <span className="font-mono text-sky-400 font-bold text-xs">{reviewingLog.time_invested || reviewingLog.duration_hours}h</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Units Completed</span>
                        <span className="font-mono text-purple-300 font-bold text-xs">{reviewingLog.unit_count_completed}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (7 Cols): 5 Pod Lead Review Fields & Comments */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      Pod Lead Verification Fields
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                      5 Required Fields
                    </span>
                  </div>

                  {/* Expected Completion Date & Completed Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-slate-200 font-bold block text-xs">
                        1. Expected Completion Date *
                      </label>
                      <input
                        type="date"
                        value={expectedCompletionDate}
                        onChange={(e) => setExpectedCompletionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-200 font-bold block text-xs">
                        2. Completed Date *
                      </label>
                      <input
                        type="date"
                        value={completedDate}
                        onChange={(e) => setCompletedDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  {/* Review Completed Date & Reviewer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-slate-200 font-bold block text-xs">
                        3. Review Completed Date *
                      </label>
                      <input
                        type="date"
                        value={reviewCompletedDate}
                        onChange={(e) => setReviewCompletedDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-200 font-bold block text-xs">
                        4. Reviewer *
                      </label>
                      <input
                        type="text"
                        value={reviewer}
                        onChange={(e) => setReviewer(e.target.value)}
                        placeholder="e.g. Renuka Gorugantu"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Error Count */}
                  <div className="space-y-1">
                    <label className="text-slate-200 font-bold block text-xs">
                      5. Errors Identified During Review *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={errorCount}
                        onChange={(e) => setErrorCount(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-28 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-rose-400 font-mono font-bold focus:outline-none focus:border-sky-500 text-sm"
                        required
                      />
                      <span className="text-[11px] text-slate-400">
                        Enter 0 if flawless. Used by Maple AI & Manager for quality assessment.
                      </span>
                    </div>
                  </div>

                  {/* Reviewer Comments & Feedback */}
                  <div className="space-y-1 pt-1">
                    <label className="text-slate-200 font-bold block text-xs">
                      Reviewer Feedback / Comments (Synced to Google Chat)
                    </label>
                    <textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      placeholder="Add feedback, notes on deliverable quality, or revision points..."
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" type="button" onClick={() => setReviewingLog(null)}>
                Cancel
              </Button>
              <GradientButton
                size="sm"
                type="submit"
                disabled={isSavingReview}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSavingReview ? 'Saving Review...' : 'Save Pod Lead Review'}
              </GradientButton>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. POD LEAD OWN WORK MODAL (WIDE 4XL LAYOUT) */}
      <Modal
        isOpen={isOwnWorkModalOpen}
        onClose={() => setIsOwnWorkModalOpen(false)}
        title="Log Pod Lead Own Deliverable (Complete Entry)"
        subtitle="Record your own work deliverables with full verification and self-assessment."
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveOwnWork} className="space-y-5 text-xs">
          <div className="p-5 rounded-2xl bg-[#081426] border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Date *</label>
                <input
                  type="date"
                  value={ownDate}
                  onChange={(e) => setOwnDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Project Name *</label>
                <input
                  type="text"
                  value={ownProject}
                  onChange={(e) => setOwnProject(e.target.value)}
                  placeholder="e.g. LXD Marketplace"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assigned Date *</label>
                <input
                  type="date"
                  value={ownAssignedDate}
                  onChange={(e) => setOwnAssignedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Task Deliverable *</label>
              <textarea
                rows={2}
                value={ownTask}
                onChange={(e) => setOwnTask(e.target.value)}
                placeholder="Specific description of your deliverable..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Hours Invested *</label>
                <input
                  type="number"
                  step="0.5"
                  value={ownTime}
                  onChange={(e) => setOwnTime(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sky-400 font-mono font-bold text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Deliverables Count *</label>
                <input
                  type="number"
                  min="1"
                  value={ownUnits}
                  onChange={(e) => setOwnUnits(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-purple-300 font-mono font-bold text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Expected Date</label>
                <input
                  type="date"
                  value={ownExpectedDate}
                  onChange={(e) => setOwnExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Completed Date</label>
                <input
                  type="date"
                  value={ownCompletedDate}
                  onChange={(e) => setOwnCompletedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Comments / Deliverable Notes</label>
              <input
                type="text"
                value={ownComments}
                onChange={(e) => setOwnComments(e.target.value)}
                placeholder="Optional notes or context..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsOwnWorkModalOpen(false)}>
              Cancel
            </Button>
            <GradientButton size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
              Save Lead Deliverable
            </GradientButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
