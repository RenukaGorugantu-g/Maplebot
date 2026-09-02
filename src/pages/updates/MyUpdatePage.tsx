// ==============================================================================
// MapleBot: My Daily Check-in & Work Performance Submission
// Dual Mode: 1. Structured Work Performance Table (9 Fields) & 2. Quick Standup
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { updatesService } from '../../services/updatesService';
import { MemberWorkTab } from '../performance/components/MemberWorkTab';
import { GradientButton, Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BlockerCategory, UpdateStatus } from '../../types/database';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar,
  Table,
  MessageSquare,
  Sparkles,
  Award,
} from 'lucide-react';
import { WarmGreetingBanner } from '../../components/ui/WarmGreetingBanner';

export const MyUpdatePage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  // Active view: 'structured_table' or 'standup_form'
  const [activeMode, setActiveMode] = useState<'structured_table' | 'standup_form'>('structured_table');

  const existingUpdate = profile?.id ? updatesService.getMemberUpdateToday(profile.id) : undefined;

  const [yesterday, setYesterday] = useState(existingUpdate?.yesterday || '');
  const [today, setToday] = useState(existingUpdate?.today || '');
  const [hasBlocker, setHasBlocker] = useState(existingUpdate?.has_blocker || false);
  const [blocker, setBlocker] = useState(existingUpdate?.blocker || '');
  const [blockerCategory, setBlockerCategory] = useState<BlockerCategory>(existingUpdate?.blocker_category || 'Task');
  const [supportNeeded, setSupportNeeded] = useState(existingUpdate?.support_needed || '');
  const [status, setStatus] = useState<UpdateStatus>(existingUpdate?.status || 'on_track');
  const [progressPercent, setProgressPercent] = useState<number>(existingUpdate?.progress_percent || 75);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(!!existingUpdate);

  useEffect(() => {
    if (existingUpdate) {
      setYesterday(existingUpdate.yesterday);
      setToday(existingUpdate.today);
      setHasBlocker(existingUpdate.has_blocker);
      setBlocker(existingUpdate.blocker || '');
      setBlockerCategory(existingUpdate.blocker_category || 'Task');
      setSupportNeeded(existingUpdate.support_needed || '');
      setStatus(existingUpdate.status);
      setProgressPercent(existingUpdate.progress_percent);
      setIsSubmittedSuccess(true);
    }
  }, [existingUpdate?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yesterday.trim() || !today.trim()) {
      showToast('warning', 'Missing Fields', 'Please complete what you finished yesterday and what you are working on today.');
      return;
    }

    if (hasBlocker && !blocker.trim()) {
      showToast('warning', 'Missing Blocker Details', 'Please describe your active blocker so managers can assist.');
      return;
    }

    setIsSubmitting(true);

    try {
      updatesService.submitUpdate({
        organization_id: profile?.organization_id || 'org-maple-01',
        checkin_id: 'chk-maple-daily',
        profile_id: profile?.id || '',
        pod_id: profile?.pod_id,
        update_date: new Date().toISOString().split('T')[0],
        yesterday,
        today,
        has_blocker: hasBlocker,
        blocker: hasBlocker ? blocker : undefined,
        blocker_category: hasBlocker ? blockerCategory : undefined,
        support_needed: hasBlocker ? supportNeeded : undefined,
        status,
        priority: 'high',
        progress_percent: progressPercent,
      });

      setIsSubmittedSuccess(true);
      showToast('success', 'Update Saved!', 'Your daily update has been logged and broadcasted to your pod.');

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#00DC82', '#38bdf8', '#fbbf24'],
        });
      } catch (e) {}
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Could not save update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Warm Uplifting Check-in Greeting Banner */}
      <WarmGreetingBanner
        variant="checkin"
        customSubtext="Take a moment to record your wins and tasks. Your team appreciates your dedication! 🌟"
      />

      {/* Top Banner with Mode Selector */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
              Work Updates & Daily Check-in
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {activeMode === 'structured_table'
              ? 'Structured Work Performance Ledger (9 Fields)'
              : 'Daily 3-Question Standup Check-in'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeMode === 'structured_table'
              ? 'Log your deliverables with project, units, time invested, and assign to Pod Lead for review.'
              : 'Submit your quick morning standup summary for the daily pod broadcast.'}
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMode('structured_table')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'structured_table'
                ? 'bg-maple-500 text-slate-950 font-extrabold shadow-glow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Structured Table (9 Fields)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('standup_form')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'standup_form'
                ? 'bg-maple-500 text-slate-950 font-extrabold shadow-glow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>3-Question Standup</span>
          </button>
        </div>
      </div>

      {/* RENDER MODE 1: STRUCTURED WORK PERFORMANCE TABLE */}
      {activeMode === 'structured_table' ? (
        <MemberWorkTab />
      ) : (
        /* RENDER MODE 2: CLASSIC 3-QUESTION STANDUP FORM */
        <div className="max-w-3xl mx-auto space-y-6">
          {isSubmittedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>You have already submitted your standup for today. You can update it below anytime.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('/updates/history')}>
                View History
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="glass-card p-6 lg:p-8 border border-slate-800 space-y-6 text-xs shadow-2xl">
            <div className="space-y-2">
              <label className="font-bold text-slate-200 flex items-center justify-between text-xs">
                <span>1. What did you complete yesterday and how much time did you spend on each task?</span>
                <span className="text-slate-500 font-normal">Required</span>
              </label>
              <textarea
                required
                rows={3}
                value={yesterday}
                placeholder="e.g. - Completed LXD Marketplace checkout module testing (4 hrs)"
                onChange={(e) => setYesterday(e.target.value)}
                className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-200 flex items-center justify-between text-xs">
                <span>2. What are you working on today and how much time are you going to spend on each task?</span>
                <span className="text-slate-500 font-normal">Required</span>
              </label>
              <textarea
                required
                rows={3}
                value={today}
                placeholder="e.g. - Implementing Learner dashboard UI components (5 hrs)"
                onChange={(e) => setToday(e.target.value)}
                className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-maple-500/50"
              />
            </div>

            {/* Status and Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="font-bold text-slate-300 block mb-2">Delivery Status</label>
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
                      className={`flex-1 py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                        status === st.val
                          ? `bg-slate-800 ${st.color} shadow-sm`
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-300">Confidence / Progress</label>
                  <span className="text-maple-400 font-bold font-mono">{progressPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(parseInt(e.target.value))}
                  className="w-full accent-maple-500"
                />
              </div>
            </div>

            {/* Blocker Section */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>3. Do you have any blockers or require manager support?</span>
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBlocker}
                    onChange={(e) => setHasBlocker(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              {hasBlocker && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="font-semibold text-rose-300 block mb-1">Blocker Description *</label>
                    <textarea
                      required={hasBlocker}
                      rows={2}
                      value={blocker}
                      placeholder="Describe what is blocking you and the impact..."
                      onChange={(e) => setBlocker(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-rose-900/60 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-300 block mb-1">Blocker Category</label>
                      <select
                        value={blockerCategory}
                        onChange={(e) => setBlockerCategory(e.target.value as BlockerCategory)}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-maple-500 text-xs"
                      >
                        <option value="Task">Task Dependency</option>
                        <option value="Technical">Technical / Code Issue</option>
                        <option value="Access">Access / Permissions</option>
                        <option value="Client">Client Feedback Delay</option>
                        <option value="Resource">Resource / Infrastructure</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-300 block mb-1">Support Needed</label>
                      <input
                        type="text"
                        value={supportNeeded}
                        placeholder="e.g. Need Sandeep to review PR"
                        onChange={(e) => setSupportNeeded(e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-maple-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" type="button" onClick={() => onNavigate('/')}>
                Cancel
              </Button>
              <GradientButton
                type="submit"
                size="sm"
                disabled={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Standup'}
              </GradientButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
