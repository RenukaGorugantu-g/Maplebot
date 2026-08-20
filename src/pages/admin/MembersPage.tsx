import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { membersService } from '../../services/membersService';
import { dataStore } from '../../services/dataStore';
import { Profile, UserRole, UserStatus } from '../../types/database';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button, GradientButton } from '../../components/ui/Button';
import { Modal, ConfirmationDialog } from '../../components/ui/Modal';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  Shield,
  Layers,
  Mail,
  Send
} from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { profile: currentLoggedInProfile, currentRole } = useAuth();
  const { showToast } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPodFilter, setSelectedPodFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Profile | null>(null);
  const [memberToDeactivate, setMemberToDeactivate] = useState<Profile | null>(null);

  // Add Member Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [podId, setPodId] = useState(currentRole === 'manager' ? currentLoggedInProfile.pod_id || '' : '');
  const [managerId, setManagerId] = useState('');
  const [sendInvite, setSendInvite] = useState(true);

  const pods = dataStore.getPods();
  const allMembers = membersService.getMembers(currentRole === 'manager' ? currentLoggedInProfile.pod_id : undefined);

  const filteredMembers = allMembers.filter((m) => {
    if (selectedPodFilter && m.pod_id !== selectedPodFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('warning', 'Missing Details', 'Please provide a full name and email address.');
      return;
    }

    const newMember = membersService.createMember({
      organization_id: currentLoggedInProfile.organization_id,
      full_name: fullName,
      email,
      role,
      pod_id: podId || undefined,
      manager_id: managerId || undefined,
      timezone: 'America/Toronto',
      status: 'active',
      avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80`,
    });

    setIsAddModalOpen(false);
    setFullName('');
    setEmail('');
    showToast('success', 'Member Added', `${newMember.full_name} was added and an invitation email was queued.`);
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    membersService.updateMember(editingMember.id, {
      full_name: editingMember.full_name,
      email: editingMember.email,
      role: editingMember.role,
      pod_id: editingMember.pod_id,
      manager_id: editingMember.manager_id,
    });

    setEditingMember(null);
    showToast('success', 'Profile Updated', 'Member details saved successfully.');
  };

  const confirmDelete = () => {
    if (!memberToDelete) return;
    membersService.deleteMember(memberToDelete.id);
    showToast('success', 'Member Removed', `${memberToDelete.full_name} has been deleted from the organization.`);
    setMemberToDelete(null);
  };

  const confirmDeactivate = () => {
    if (!memberToDeactivate) return;
    if (memberToDeactivate.status === 'active') {
      membersService.deactivateMember(memberToDeactivate.id);
      showToast('info', 'Member Deactivated', `${memberToDeactivate.full_name} will no longer receive check-ins.`);
    } else {
      membersService.reactivateMember(memberToDeactivate.id);
      showToast('success', 'Member Reactivated', `${memberToDeactivate.full_name} is now active.`);
    }
    setMemberToDeactivate(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
              Team Directory
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Organization Members</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage roles, pod assignments, direct reports, and active roster access.
          </p>
        </div>

        <GradientButton
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Team Member
        </GradientButton>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50"
          />
        </div>

        {currentRole === 'admin' && (
          <select
            value={selectedPodFilter}
            onChange={(e) => setSelectedPodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
          >
            <option value="">All Pods ({pods.length})</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Members Table */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Pod</th>
                <th className="px-5 py-3.5">Manager</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Standup</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 flex items-center gap-3">
                    <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                    <div>
                      <span className="font-semibold text-white block">{m.full_name}</span>
                      <span className="text-[11px] text-slate-500">{m.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-md text-[10px] uppercase border ${
                        m.role === 'admin'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : m.role === 'manager'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-200">
                    {m.pod?.name || <span className="text-slate-500 italic">Organization-wide</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {m.manager?.full_name || <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-slate-400">
                    {m.last_update ? (
                      <span>{new Date(m.last_update.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    ) : (
                      <span className="text-slate-600 italic">No updates</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => setEditingMember(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMemberToDeactivate(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      title={m.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    >
                      {m.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                    {currentRole === 'admin' && (
                      <button
                        onClick={() => setMemberToDelete(m)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Team Member"
        subtitle="Invite a new contributor to Maple Learning Solutions."
      >
        <form onSubmit={handleAddMember} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-white">Full Name <span className="text-rose-400">*</span></label>
            <input
              required
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maya Chen"
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Work Email <span className="text-rose-400">*</span></label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maya.chen@maplelearning.com"
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-white">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={currentRole === 'manager'}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              >
                <option value="member">Team Member</option>
                <option value="manager">Pod Manager</option>
                {currentRole === 'admin' && <option value="admin">Organization Admin</option>}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Pod / Department</label>
              <select
                value={podId}
                onChange={(e) => setPodId(e.target.value)}
                disabled={currentRole === 'manager'}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              >
                <option value="">Select Pod...</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Assigned Manager</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
            >
              <option value="">Select Manager...</option>
              {allMembers.filter((m) => m.role === 'manager' || m.role === 'admin').map((m) => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.pod?.name || m.role})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="invite"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="rounded bg-slate-900 border-slate-800 text-maple-500 focus:ring-0"
            />
            <label htmlFor="invite" className="text-slate-300 text-xs cursor-pointer">
              Send welcome invitation email immediately
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <GradientButton type="submit">Add Member</GradientButton>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title={`Edit Member: ${editingMember.full_name}`}
        >
          <form onSubmit={handleUpdateMember} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-white">Full Name</label>
              <input
                type="text"
                value={editingMember.full_name}
                onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Email Address</label>
              <input
                type="email"
                value={editingMember.email}
                onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-white">Role</label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as UserRole })}
                  disabled={currentRole === 'manager'}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                >
                  <option value="member">Team Member</option>
                  <option value="manager">Pod Manager</option>
                  <option value="admin">Organization Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">Pod</label>
                <select
                  value={editingMember.pod_id || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, pod_id: e.target.value || undefined })}
                  disabled={currentRole === 'manager'}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                >
                  <option value="">None</option>
                  {pods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingMember(null)}>Cancel</Button>
              <GradientButton type="submit">Save Changes</GradientButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Dialog */}
      <ConfirmationDialog
        isOpen={!!memberToDeactivate}
        onClose={() => setMemberToDeactivate(null)}
        onConfirm={confirmDeactivate}
        title={memberToDeactivate?.status === 'active' ? 'Deactivate Member?' : 'Reactivate Member?'}
        message={
          memberToDeactivate?.status === 'active'
            ? `Deactivating ${memberToDeactivate?.full_name} will pause their daily standup check-ins and notifications.`
            : `Reactivate ${memberToDeactivate?.full_name} to resume daily check-ins.`
        }
        confirmLabel={memberToDeactivate?.status === 'active' ? 'Deactivate Member' : 'Reactivate'}
        variant={memberToDeactivate?.status === 'active' ? 'danger' : 'primary'}
      />

      {/* Delete Dialog */}
      <ConfirmationDialog
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={confirmDelete}
        title="Permanently Delete Member?"
        message={`Are you sure you want to delete ${memberToDelete?.full_name}? This action cannot be undone.`}
        confirmLabel="Delete Member"
        variant="danger"
      />
    </div>
  );
};
