import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { updatesService } from '../../services/updatesService';
import { GradientButton, Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BlockerCategory, UpdateStatus } from '../../types/database';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar
} from 'lucide-react';

export const MyUpdatePage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

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
      showToast('success', 'Standup Submitted!', 'Your update is now broadcast to your pod.');

      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00DC82', '#38bdf8', '#fbbf24'],
        });
      } catch (e) {
        // confetti fallback
      }
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Could not save update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="glass-card p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
              Daily Coordination
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Daily Standup Check-in
          </h2>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <Calendar className="w-4 h-4 text-maple-400" />
          <span className="font-semibold text-white">9:00 AM – 11:00 AM</span>
        </div>
      </div>

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

      {/* Main Standup Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 lg:p-8 border border-slate-800 space-y-6 text-xs shadow-2xl">
        <div className="space-y-2">
          <label className="font-bold text-slate-200 flex items-center justify-between text-xs">
            <span>1. What did you complete yesterday?</span>
            <span className="text-slate-500 font-normal">Required</span>
          </label>
          <textarea
            required
            rows={3}
            value={yesterday}
            onChange={(e) => setYesterday(e.target.value)}
            className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-maple-500/50"
          />
        </div>

        <div className="space-y-2">
          <label className="font-bold text-slate-200 flex items-center justify-between text-xs">
            <span>2. What are you working on today?</span>
            <span className="text-slate-500 font-normal">Required</span>
          </label>
          <textarea
            required
            rows={3}
            value={today}
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
              step={5}
              value={progressPercent}
              onChange={(e) => setProgressPercent(Number(e.target.value))}
              className="w-full accent-maple-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Question 3: Blockers & Support */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <label className="font-bold text-slate-200 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className={`w-4 h-4 ${hasBlocker ? 'text-rose-400' : 'text-emerald-400'}`} />
              3. Do you have any blockers or require team support?
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setHasBlocker(false);
                setBlocker('');
                setSupportNeeded('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                !hasBlocker
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>No Blockers (All Clear)</span>
            </button>

            <button
              type="button"
              onClick={() => setHasBlocker(true)}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                hasBlocker
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Yes, I Have a Blocker</span>
            </button>
          </div>

          {hasBlocker && (
            <div className="pt-2 space-y-3 animate-in fade-in">
              <div>
                <label className="font-semibold text-rose-200 block mb-1 text-xs">
                  Blocker Description (What is stopping you?)
                </label>
                <input
                  type="text"
                  required
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-rose-800/60 rounded-lg text-white focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-rose-200 block mb-1 text-xs">
                  Support Needed From Team / Manager
                </label>
                <input
                  type="text"
                  value={supportNeeded}
                  onChange={(e) => setSupportNeeded(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-rose-800/60 rounded-lg text-white focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setYesterday('');
              setToday('');
              setHasBlocker(false);
              setBlocker('');
              setSupportNeeded('');
              setProgressPercent(75);
              setStatus('on_track');
              showToast('info', 'Form Cleared', 'Standup inputs have been cleared.');
            }}
            className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-semibold"
          >
            Clear Form
          </button>
          <GradientButton
            type="submit"
            isLoading={isSubmitting}
            className="flex-1 py-3"
            rightIcon={<Send className="w-4 h-4" />}
          >
            {existingUpdate ? 'Update Daily Standup' : 'Submit Daily Standup'}
          </GradientButton>
        </div>
      </form>
    </div>
  );
};
