import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { googleChatService } from '../../services/googleChatService';
import { GoogleChatSettings } from '../../types/database';
import { Button, GradientButton } from '../../components/ui/Button';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Calendar,
  ExternalLink,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const GoogleChatPage: React.FC = () => {
  const { showToast } = useNotifications();
  const initialSettings = googleChatService.getSettings();

  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [spaceName, setSpaceName] = useState(initialSettings.space_name || 'Maple Team Updates');
  const [spaceId, setSpaceId] = useState(initialSettings.space_id || 'spaces/AAAA_maple_team_updates');
  const [webhookUrl, setWebhookUrl] = useState(initialSettings.webhook_url || '');
  const [reportTime, setReportTime] = useState(initialSettings.report_time || '10:30');
  const [dailyReports, setDailyReports] = useState(initialSettings.daily_reports);
  const [weeklyReports, setWeeklyReports] = useState(initialSettings.weekly_reports);
  const [sprintReports, setSprintReports] = useState(initialSettings.sprint_reports);
  const [blockerAlerts, setBlockerAlerts] = useState(initialSettings.blocker_alerts);
  const [kudosAlerts, setKudosAlerts] = useState(initialSettings.kudos_alerts);

  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    googleChatService.updateSettings({
      enabled,
      space_name: spaceName,
      space_id: spaceId,
      webhook_url: webhookUrl,
      report_time: reportTime,
      daily_reports: dailyReports,
      weekly_reports: weeklyReports,
      sprint_reports: sprintReports,
      blocker_alerts: blockerAlerts,
      kudos_alerts: kudosAlerts,
    });
    showToast('success', 'Integration Saved', 'Google Chat Space integration settings updated.');
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      const res = await googleChatService.sendTestMessage();
      showToast('success', 'Test Message Dispatched', res.message);
    } catch (err: any) {
      showToast('error', 'Test Failed', 'Unable to dispatch Google Chat card.');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Google Workspace Integration
            </span>
            <span className="text-slate-600">•</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {enabled ? 'Connected' : 'Disabled'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Google Chat Space Integration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Post automated standup updates, daily summaries, blocker alerts, and kudos directly into Google Chat.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            isLoading={isSendingTest}
            onClick={handleSendTest}
            leftIcon={<Send className="w-4 h-4 text-blue-400" />}
          >
            Send Test Message
          </Button>
          <GradientButton size="md" onClick={handleSave}>
            Save Settings
          </GradientButton>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Connection Settings Card */}
        <div className="glass-card p-6 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Space & Webhook Credentials</span>
            </h3>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className="flex items-center gap-2 text-xs text-slate-300 font-semibold"
            >
              <span>{enabled ? 'Integration Active' : 'Integration Paused'}</span>
              {enabled ? (
                <ToggleRight className="w-6 h-6 text-maple-400" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Space Name</label>
              <input
                type="text"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="e.g. Maple Team Updates"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Space ID</label>
              <input
                type="text"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                placeholder="e.g. spaces/AAAA_maple_team_updates"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-slate-300">
                Incoming Webhook URL / Google Chat API Endpoint
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-maple-500/50"
              />
              <span className="text-[10px] text-slate-500 block">
                Webhook keys are encrypted server-side through Supabase Edge Functions.
              </span>
            </div>
          </div>
        </div>

        {/* Notification Event Toggles Card */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Event Broadcast Preferences</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              {
                id: 'daily_reports',
                label: 'Daily Executive Team Report',
                desc: `Compiles standup statistics & pod progress at ${reportTime} AM`,
                checked: dailyReports,
                toggle: () => setDailyReports(!dailyReports),
                icon: <Calendar className="w-4 h-4 text-maple-400" />,
              },
              {
                id: 'blocker_alerts',
                label: 'High & Critical Blocker Alerts',
                desc: 'Instantly alerts space when high/critical impediments are reported',
                checked: blockerAlerts,
                toggle: () => setBlockerAlerts(!blockerAlerts),
                icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
              },
              {
                id: 'kudos_alerts',
                label: 'Peer Kudos Celebrations',
                desc: 'Broadcasts cultural appreciation and praise cards to the space',
                checked: kudosAlerts,
                toggle: () => setKudosAlerts(!kudosAlerts),
                icon: <Heart className="w-4 h-4 text-rose-400" />,
              },
              {
                id: 'weekly_reports',
                label: 'Weekly Wrap-up & Milestones',
                desc: 'Friday executive standup summary and sprint milestone breakdown',
                checked: weeklyReports,
                toggle: () => setWeeklyReports(!weeklyReports),
                icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
              },
            ].map((item) => (
              <div
                key={item.id}
                onClick={item.toggle}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-start justify-between gap-3 select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 mt-0.5">{item.icon}</div>
                  <div>
                    <span className="font-semibold text-white block">{item.label}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  {item.checked ? (
                    <ToggleRight className="w-5 h-5 text-maple-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Interactive Card Preview */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Google Chat Card Message Preview</h3>
            <span className="text-[11px] text-slate-400">Card v2 Payload</span>
          </div>

          <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#081426] border border-slate-700/80 shadow-xl space-y-4 text-xs font-sans">
            {/* Card Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-full bg-maple-500 text-slate-950 font-black flex items-center justify-center text-sm">
                M
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">MapleBot — Daily Team Report</h4>
                <span className="text-[10px] text-slate-400">Participation: 86% (18/21 submitted)</span>
              </div>
            </div>

            {/* Standup Body */}
            <div className="space-y-2 text-slate-300">
              <p className="font-medium text-white">
                ✅ <strong>18</strong> Submitted &nbsp;|&nbsp; ⏳ <strong>3</strong> Pending &nbsp;|&nbsp; ⚠️ <strong>2</strong> Blockers
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900/90 text-[11px] space-y-1 text-slate-300">
                <p>• <strong>Web & Sales:</strong> 8/9 submitted, 1 blocker</p>
                <p>• <strong>Marketing:</strong> 5/6 submitted, 0 blockers</p>
                <p>• <strong>eLearning:</strong> 7/8 submitted, 1 blocker</p>
                <p>• <strong>HR:</strong> 4/5 submitted, 0 blockers</p>
              </div>
            </div>

            {/* Interactive Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 flex items-center gap-1 cursor-default">
                View Full Report <ExternalLink className="w-3 h-3 text-maple-400" />
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 flex items-center gap-1 cursor-default">
                View Blockers <ExternalLink className="w-3 h-3 text-rose-400" />
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
