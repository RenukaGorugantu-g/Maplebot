// ==============================================================================
// MapleBot: Create Structured Work Log Modal
// Allows logging atomic tasks with deliverables, outcomes, impact, and hours
// ==============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button, GradientButton } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { WorkCategory, WorkPriority, WorkStatus } from '../../../types/performance';
import { AlertTriangle } from 'lucide-react';

interface CreateWorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultEmployeeId?: string;
}

const CATEGORIES: WorkCategory[] = [
  'Development',
  'SEO',
  'Sales',
  'LMS',
  'Marketing',
  'Coordination',
  'Design',
  'Operations',
  'Quality Assurance',
  'Client Support',
  'Other',
];

export const CreateWorkLogModal: React.FC<CreateWorkLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultEmployeeId,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId || profile?.id || 'prof-harshika');
  const [project, setProject] = useState<string>('LXD Marketplace');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [category, setCategory] = useState<WorkCategory>('Development');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [durationHours, setDurationHours] = useState<number>(4.0);
  const [status, setStatus] = useState<WorkStatus>('completed');
  const [priority, setPriority] = useState<WorkPriority>('medium');
  const [deliverable, setDeliverable] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('');
  const [impact, setImpact] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>(profile?.manager?.full_name || 'Renuka Gorugantu');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !project.trim()) {
      setErrorMsg('Please specify both project and task title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const targetEmp = dataStore.getProfileById(employeeId) || profile;
      const targetPod = targetEmp?.pod_id ? dataStore.getPodById(targetEmp.pod_id) : undefined;

      dataStore.createPerformanceWorkLog({
        organization_id: targetEmp?.organization_id || 'org-maple-01',
        employee_id: employeeId,
        employee_name: targetEmp?.full_name || 'Team Member',
        department_id: targetEmp?.pod_id,
        department: targetPod?.name || 'Maple Learning Solutions',
        project,
        project_name: project,
        task: taskTitle.trim(),
        task_title: taskTitle.trim(),
        task_description: taskDescription.trim() || undefined,
        assigned_date: date,
        time_invested: Number(durationHours) || 0,
        duration_hours: Number(durationHours) || 0,
        unit_count_completed: 1,
        review_assigned_date: date,
        category,
        date,
        status,
        priority,
        workflow_status: 'submitted',
        delivery_status: 'pending',
        deliverable: deliverable.trim() || undefined,
        outcome: outcome.trim() || undefined,
        impact: impact.trim() || undefined,
        reviewer_name: reviewerName.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save structured work record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Structured Work Record" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Employee Selection */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Employee *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={!isAdmin && !isManager}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer disabled:opacity-70"
            >
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Project / Initiative *</label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="e.g. LXD Marketplace, Maple LMS"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
              required
            />
          </div>
        </div>

        {/* Task Title */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1">Task / Activity Title *</label>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="e.g. SEO Keyword & Meta Tag Architecture"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1">Detailed Description (Optional)</label>
          <textarea
            rows={2}
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Specific technical or operational details of the work performed..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 resize-none"
          />
        </div>

        {/* Row: Category, Date, Hours, Status, Priority */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkCategory)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Hours Spent</label>
            <input
              type="number"
              min="0.25"
              max="24"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkStatus)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as WorkPriority)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Deliverable, Outcome, Impact (Core Value Matrix) */}
        <div className="p-3.5 rounded-xl bg-[#081426] border border-slate-800 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400 block">
            Executive Deliverable & Value Matrix
          </span>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Deliverable (What artifact / code was produced)
            </label>
            <input
              type="text"
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              placeholder="e.g. 12 category pages updated with JSON-LD schema"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Outcome (What result was achieved)
            </label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Eliminated duplicate title tags and enhanced structured indexing"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Impact (Why it mattered / business significance)
            </label>
            <input
              type="text"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="e.g. Improved organic search crawlability; leave empty if not measurable"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <GradientButton size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Record...' : 'Log Work Record'}
          </GradientButton>
        </div>
      </form>
    </Modal>
  );
};
