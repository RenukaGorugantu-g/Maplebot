import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button, GradientButton } from '../ui/Button';
import { dataStore } from '../../services/dataStore';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { UpdateStatus, BlockerCategory } from '../../types/database';
import { Calendar, User, CheckCircle2, AlertTriangle, Plus, UploadCloud } from 'lucide-react';

interface StandupBackfillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StandupBackfillModal: React.FC<StandupBackfillModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentRole, userPod } = useAuth();
  const { showToast } = useNotifications();

  const isManager = currentRole === 'manager';
  const authorizedPodId = userPod?.id;

  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableMembers = isManager && authorizedPodId
    ? allProfiles.filter(
        (p) => p.pod_id === authorizedPodId || (p.pod_ids && p.pod_ids.includes(authorizedPodId))
      )
    : allProfiles;

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [profileId, setProfileId] = useState<string>(availableMembers[0]?.id || '');
  const [updateDate, setUpdateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [status, setStatus] = useState<UpdateStatus>('on_track');
  const [progress, setProgress] = useState<number>(100);
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blocker, setBlocker] = useState('');
  const [blockerCategory, setBlockerCategory] = useState<BlockerCategory>('Other');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !yesterday.trim() || !today.trim()) {
      showToast('error', 'Missing Fields', 'Please fill in all required standup fields.');
      return;
    }

    setIsSubmitting(true);
    const targetMember = dataStore.getProfileById(profileId);
    const podId = targetMember?.pod_id || authorizedPodId || 'pod-web-sales';

    try {
      dataStore.submitUpdate({
        organization_id: targetMember?.organization_id || 'org-maple-01',
        checkin_id: 'chk-maple-daily',
        profile_id: profileId,
        pod_id: podId,
        update_date: updateDate,
        yesterday: yesterday.trim(),
        today: today.trim(),
        has_blocker: hasBlocker,
        blocker: hasBlocker ? blocker.trim() : undefined,
        blocker_category: hasBlocker ? blockerCategory : undefined,
        support_needed: hasBlocker ? supportNeeded.trim() : undefined,
        status: status,
        priority: status === 'blocked' ? 'high' : status === 'at_risk' ? 'high' : 'medium',
        progress_percent: progress,
      });

      // Force immediate Supabase refresh
      await dataStore.refreshFromSupabase();

      showToast(
        'success',
        'Standup Saved to Database',
        `Successfully saved and synced update for ${targetMember?.full_name || 'Member'} (${updateDate}).`
      );

      setYesterday('');
      setToday('');
      setBlocker('');
      setSupportNeeded('');
      setHasBlocker(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Failed to save standup update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      showToast('error', 'Empty Input', 'Please paste standup data to import.');
      return;
    }

    setIsSubmitting(true);
    let importedCount = 0;

    try {
      // Parse JSON array or line-delimited entries
      let entries: any[] = [];
      try {
        entries = JSON.parse(bulkText);
      } catch {
        // Line format: Name or Email | Date | Yesterday | Today | Status
        const lines = bulkText.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 4) {
            const memberIdent = parts[0];
            const dateStr = parts[1];
            const yest = parts[2];
            const tod = parts[3];
            const stat = (parts[4] as UpdateStatus) || 'on_track';

            const foundProf = allProfiles.find(
              (p) =>
                p.email.toLowerCase() === memberIdent.toLowerCase() ||
                p.full_name.toLowerCase() === memberIdent.toLowerCase() ||
                p.id === memberIdent
            );

            if (foundProf) {
              entries.push({
                profile_id: foundProf.id,
                pod_id: foundProf.pod_id,
                update_date: dateStr,
                yesterday: yest,
                today: tod,
                status: stat,
                progress_percent: 100,
              });
            }
          }
        }
      }

      if (!Array.isArray(entries) || entries.length === 0) {
        showToast('error', 'Parse Error', 'Could not recognize standup entries. Check formatting.');
        setIsSubmitting(false);
        return;
      }

      for (const entry of entries) {
        dataStore.submitUpdate({
          organization_id: 'org-maple-01',
          checkin_id: 'chk-maple-daily',
          profile_id: entry.profile_id,
          pod_id: entry.pod_id || 'pod-web-sales',
          update_date: entry.update_date || updateDate,
          yesterday: entry.yesterday,
          today: entry.today,
          has_blocker: !!entry.has_blocker,
          blocker: entry.blocker,
          blocker_category: entry.blocker_category,
          support_needed: entry.support_needed,
          status: entry.status || 'on_track',
          priority: 'medium',
          progress_percent: entry.progress_percent || 100,
        });
        importedCount++;
      }

      await dataStore.refreshFromSupabase();
      showToast('success', 'Bulk Import Complete', `Imported and synced ${importedCount} standup records into Supabase.`);
      setBulkText('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast('error', 'Import Failed', err.message || 'Error during bulk import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Backfill Standup Updates"
      subtitle="Save past or missing standup submissions directly to the Supabase database."
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Mode Selector */}
        <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'single'
                ? 'bg-maple-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Standup Entry
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'bulk'
                ? 'bg-maple-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulk Import (Paste Text / JSON)
          </button>
        </div>

        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Team Member
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 cursor-pointer"
                  >
                    {availableMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Standup Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={updateDate}
                    onChange={(e) => setUpdateDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">
                1. What did you complete yesterday and how much time did you spend on each task?
              </label>
              <textarea
                required
                rows={3}
                value={yesterday}
                onChange={(e) => setYesterday(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">
                2. What are you working on today and how much time are you going to spend on each task?
              </label>
              <textarea
                required
                rows={3}
                value={today}
                onChange={(e) => setToday(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            {/* Status and Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Delivery Status</label>
                <div className="flex gap-2">
                  {[
                    { val: 'on_track', label: 'On Track', color: 'border-emerald-500/40 text-emerald-400' },
                    { val: 'at_risk', label: 'At Risk', color: 'border-amber-500/40 text-amber-400' },
                    { val: 'blocked', label: 'Blocked', color: 'border-rose-500/40 text-rose-400' },
                  ].map((st) => (
                    <button
                      key={st.val}
                      type="button"
                      onClick={() => setStatus(st.val as UpdateStatus)}
                      className={`flex-1 py-1 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                        status === st.val
                          ? `bg-slate-800 ${st.color} shadow-sm`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300">Progress</label>
                  <span className="text-maple-400 font-bold font-mono">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-maple-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Blocker Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Flag Active Blocker?</span>
                <button
                  type="button"
                  onClick={() => setHasBlocker(!hasBlocker)}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold ${
                    hasBlocker
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {hasBlocker ? 'Yes, Has Blocker' : 'No Blockers'}
                </button>
              </div>

              {hasBlocker && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    required
                    value={blocker}
                    onChange={(e) => setBlocker(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-800/60 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="text"
                    value={supportNeeded}
                    onChange={(e) => setSupportNeeded(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-800/60 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <GradientButton type="submit" isLoading={isSubmitting} leftIcon={<Plus className="w-4 h-4" />}>
                Save to Database
              </GradientButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">
                Paste Standup Entries (Pipe-separated or JSON)
              </label>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Format: <code className="text-maple-400 bg-slate-900 px-1 py-0.5 rounded">Email/Name | YYYY-MM-DD | Yesterday Deliverables | Today Focus | Status</code>
              </p>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <GradientButton
                type="button"
                onClick={handleBulkImport}
                isLoading={isSubmitting}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Import All to Supabase
              </GradientButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
