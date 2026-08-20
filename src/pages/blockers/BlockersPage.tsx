import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { blockersService } from '../../services/blockersService';
import { dataStore } from '../../services/dataStore';
import { Blocker, BlockerSeverity, BlockerStatus, BlockerCategory } from '../../types/database';
import { StatusBadge, SeverityBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { Button, GradientButton } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  MessageSquare,
  UserCheck,
  Filter,
  Search,
  Check,
  Send
} from 'lucide-react';

export const BlockersPage: React.FC<{
  onNavigate: (path: string) => void;
  selectedPodId?: string;
}> = ({ onNavigate, selectedPodId: initialPodId }) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  const [selectedPod, setSelectedPod] = useState<string>(initialPodId || '');
  const [selectedStatus, setSelectedStatus] = useState<string>('open');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeBlockerForDetails, setActiveBlockerForDetails] = useState<Blocker | null>(null);
  const [newComment, setNewComment] = useState('');

  // New Blocker Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<BlockerCategory>('Task');
  const [newSeverity, setNewSeverity] = useState<BlockerSeverity>('high');
  const [newAssignee, setNewAssignee] = useState('');

  const pods = dataStore.getPods();
  const members = dataStore.getProfiles();
  const analytics = blockersService.getBlockerAnalytics(selectedPod || undefined);

  const allBlockers = blockersService.getBlockers({
    podId: selectedPod || undefined,
    status: (selectedStatus as BlockerStatus) || undefined,
    severity: selectedSeverity || undefined,
  });

  const filteredBlockers = allBlockers.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.reporter?.full_name && b.reporter.full_name.toLowerCase().includes(q)) ||
      (b.pod?.name && b.pod.name.toLowerCase().includes(q))
    );
  });

  const handleCreateBlocker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('warning', 'Title Required', 'Please enter a title for the blocker.');
      return;
    }

    blockersService.createBlocker({
      organization_id: profile?.organization_id || 'org-maple-01',
      reported_by: profile?.id || '',
      pod_id: profile?.pod_id,
      title: newTitle,
      description: newDesc,
      category: newCategory,
      severity: newSeverity,
      status: 'open',
      assigned_to: newAssignee || undefined,
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    showToast('success', 'Blocker Logged', 'New blocker tracked and assigned.');
  };

  const handleResolveBlocker = (blockerId: string) => {
    blockersService.resolveBlocker(blockerId, 'resolved');
    if (activeBlockerForDetails?.id === blockerId) {
      setActiveBlockerForDetails(null);
    }
    showToast('success', 'Blocker Resolved', 'Blocker marked as resolved successfully.');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeBlockerForDetails || !profile?.id) return;

    blockersService.addComment(activeBlockerForDetails.id, profile.id, newComment);
    setNewComment('');
    // Refresh active blocker
    const updated = dataStore.getBlockers().find((b) => b.id === activeBlockerForDetails.id);
    if (updated) setActiveBlockerForDetails(updated);
    showToast('info', 'Comment Added', 'Discussion comment posted.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Impediment Tracking
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Blocker & Impediment Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify, assign, discuss, and resolve blockers impacting sprints and deliverables.
          </p>
        </div>

        <GradientButton
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Report Blocker
        </GradientButton>
      </div>

      {/* Analytics KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Open</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{analytics.open}</p>
        </div>
        <div className="glass-card p-4 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">In Progress</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">{analytics.inProgress}</p>
        </div>
        <div className="glass-card p-4 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Critical Severity</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{analytics.critical}</p>
        </div>
        <div className="glass-card p-4 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Resolved</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{analytics.resolved}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blockers..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={selectedPod}
          onChange={(e) => setSelectedPod(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
        >
          <option value="">All Pods</option>
          {pods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Blockers Table */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Blocker Title</th>
                <th className="px-5 py-3.5">Reported By</th>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Assigned Owner</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBlockers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <EmptyState
                      title="No blockers found"
                      description="No active impediments match the selected criteria."
                    />
                  </td>
                </tr>
              ) : (
                filteredBlockers.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setActiveBlockerForDetails(b)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 max-w-xs">
                      <span className="font-semibold text-white block line-clamp-1">{b.title}</span>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{b.description}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={b.reporter?.full_name || 'User'} src={b.reporter?.avatar_url} size="xs" />
                        <div>
                          <span className="font-medium text-white block">{b.reporter?.full_name}</span>
                          <span className="text-[10px] text-slate-500">{b.pod?.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <SeverityBadge severity={b.severity} />
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-300">
                      {b.category}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-200">
                        {b.assignee?.full_name || <span className="text-slate-500 italic">Unassigned</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {b.status !== 'resolved' && b.status !== 'closed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveBlocker(b.id)}
                          leftIcon={<Check className="w-3 h-3 text-emerald-400" />}
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Blocker Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Report New Blocker"
        subtitle="Escalate a dependency, access hurdle, or project blocker."
      >
        <form onSubmit={handleCreateBlocker} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-white">Blocker Title <span className="text-rose-400">*</span></label>
            <input
              required
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Awaiting API Sandbox credentials for HubSpot CRM"
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Description & Impact</label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe what is blocked, how long it has been stalled, and next steps..."
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-white">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BlockerCategory)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              >
                {['Task', 'Project', 'Client', 'Team', 'Access', 'Dependency', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as BlockerSeverity)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Assign Owner for Resolution</label>
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.pod?.name || m.role})</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <GradientButton type="submit">Log Blocker</GradientButton>
          </div>
        </form>
      </Modal>

      {/* Blocker Details & Discussion Modal */}
      {activeBlockerForDetails && (
        <Modal
          isOpen={!!activeBlockerForDetails}
          onClose={() => setActiveBlockerForDetails(null)}
          title={activeBlockerForDetails.title}
          subtitle={`Reported by ${activeBlockerForDetails.reporter?.full_name} (${activeBlockerForDetails.pod?.name})`}
          maxWidth="xl"
        >
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={activeBlockerForDetails.severity} />
                <StatusBadge status={activeBlockerForDetails.status} />
                <span className="text-slate-400 font-medium">• Category: {activeBlockerForDetails.category}</span>
              </div>
              <span className="text-slate-500 text-[11px]">
                Owner: <strong className="text-white">{activeBlockerForDetails.assignee?.full_name || 'Unassigned'}</strong>
              </span>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">Description</span>
              <p className="mt-1 text-slate-200 leading-relaxed text-sm bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 whitespace-pre-line">
                {activeBlockerForDetails.description || 'No additional description provided.'}
              </p>
            </div>

            {/* Comment Thread */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <MessageSquare className="w-3.5 h-3.5 text-maple-400" />
                <span>Discussion Thread ({activeBlockerForDetails.comments?.length || 0})</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(!activeBlockerForDetails.comments || activeBlockerForDetails.comments.length === 0) ? (
                  <p className="text-slate-500 italic py-2">No discussion comments yet. Add an update below.</p>
                ) : (
                  activeBlockerForDetails.comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-maple-300">{c.user?.full_name || 'Team Member'}</span>
                        <span className="text-slate-500">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post comment or resolution update..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                />
                <Button type="submit" variant="secondary" size="sm" rightIcon={<Send className="w-3 h-3" />}>
                  Reply
                </Button>
              </form>
            </div>

            {/* Resolution Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setActiveBlockerForDetails(null)}>Close</Button>
              {activeBlockerForDetails.status !== 'resolved' && (
                <GradientButton onClick={() => handleResolveBlocker(activeBlockerForDetails.id)}>
                  Mark as Resolved
                </GradientButton>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
