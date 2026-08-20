import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { podsService } from '../../services/membersService';
import { dataStore } from '../../services/dataStore';
import { Pod } from '../../types/database';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button, GradientButton } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Layers,
  Plus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Archive,
  ArrowRight
} from 'lucide-react';

export const PodsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { currentRole, profile } = useAuth();
  const { showToast } = useNotifications();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [selectedPodDetails, setSelectedPodDetails] = useState<Pod | null>(null);

  // Form state
  const [podName, setPodName] = useState('');
  const [podDescription, setPodDescription] = useState('');
  const [managerId, setManagerId] = useState('');

  const pods = dataStore.getPods();
  const managers = dataStore.getProfiles().filter((m) => m.role === 'manager' || m.role === 'admin');

  const handleCreatePod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podName.trim()) {
      showToast('warning', 'Name Required', 'Please enter a pod name.');
      return;
    }

    podsService.createPod({
      organization_id: profile.organization_id,
      name: podName,
      description: podDescription,
      manager_id: managerId || undefined,
    });

    setIsCreateModalOpen(false);
    setPodName('');
    setPodDescription('');
    setManagerId('');
    showToast('success', 'Pod Created', `Pod "${podName}" has been established.`);
  };

  const handleUpdatePod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPod) return;

    podsService.updatePod(editingPod.id, {
      name: editingPod.name,
      description: editingPod.description,
      manager_id: editingPod.manager_id,
    });

    setEditingPod(null);
    showToast('success', 'Pod Updated', 'Pod changes have been saved.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
              Department Structure
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Pods & Team Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize Maple Learning Solutions into functional pods with dedicated managers.
          </p>
        </div>

        {currentRole === 'admin' && (
          <GradientButton
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create New Pod
          </GradientButton>
        )}
      </div>

      {/* Pods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pods.map((pod) => (
          <div
            key={pod.id}
            className="glass-card p-6 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{pod.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {pod.description || 'No description provided.'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-maple-500/10 text-maple-400 border border-maple-500/20">
                  {pod.participation_rate}% Participation
                </span>
              </div>

              {/* Manager Card */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={pod.manager?.full_name || 'Manager'} src={pod.manager?.avatar_url} size="sm" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {pod.manager?.full_name || <span className="text-slate-500 italic">No Lead Assigned</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">Pod Lead / Manager</span>
                  </div>
                </div>
                {currentRole === 'admin' && (
                  <button
                    onClick={() => setEditingPod(pod)}
                    className="text-slate-400 hover:text-maple-400 p-1 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Members</span>
                  <p className="font-bold text-white mt-0.5">{pod.members_count}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Submitted Today</span>
                  <p className="font-bold text-emerald-400 mt-0.5">
                    {Math.round(((pod.members_count || 0) * (pod.participation_rate || 0)) / 100)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Blockers</span>
                  <p className={`font-bold mt-0.5 ${(pod.active_blockers_count || 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {pod.active_blockers_count || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('/updates/team')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Pod Standups
              </Button>
              {currentRole === 'admin' && (
                <button
                  onClick={() => setEditingPod(pod)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Edit Configuration
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Pod Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Pod"
        subtitle="Define a new department or functional pod."
      >
        <form onSubmit={handleCreatePod} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-white">Pod Name <span className="text-rose-400">*</span></label>
            <input
              required
              type="text"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              placeholder="e.g. AI & Solutions"
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Description & Responsibilities</label>
            <textarea
              rows={3}
              value={podDescription}
              onChange={(e) => setPodDescription(e.target.value)}
              placeholder="Describe what this pod is responsible for..."
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Assign Pod Manager</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            >
              <option value="">Choose Manager...</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <GradientButton type="submit">Create Pod</GradientButton>
          </div>
        </form>
      </Modal>

      {/* Edit Pod Modal */}
      {editingPod && (
        <Modal
          isOpen={!!editingPod}
          onClose={() => setEditingPod(null)}
          title={`Edit Pod: ${editingPod.name}`}
        >
          <form onSubmit={handleUpdatePod} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-white">Pod Name</label>
              <input
                type="text"
                value={editingPod.name}
                onChange={(e) => setEditingPod({ ...editingPod, name: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Description</label>
              <textarea
                rows={3}
                value={editingPod.description || ''}
                onChange={(e) => setEditingPod({ ...editingPod, description: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Assigned Manager</label>
              <select
                value={editingPod.manager_id || ''}
                onChange={(e) => setEditingPod({ ...editingPod, manager_id: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              >
                <option value="">No Manager Assigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingPod(null)}>Cancel</Button>
              <GradientButton type="submit">Save Pod</GradientButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
