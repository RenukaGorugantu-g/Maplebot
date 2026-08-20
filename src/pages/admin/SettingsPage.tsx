import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { dataStore } from '../../services/dataStore';
import { Button, GradientButton } from '../../components/ui/Button';
import { Settings, Globe, Shield, Bot, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const org = dataStore.getOrganization();

  const [orgName, setOrgName] = useState(org.name);
  const [timezone, setTimezone] = useState(org.timezone || 'America/Toronto');
  const [slug, setSlug] = useState(org.slug);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.updateOrganization({
      name: orgName,
      timezone,
      slug,
    });
    showToast('success', 'Settings Saved', 'Organization settings and brand parameters updated.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
              System Administration
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Organization Settings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure company branding, domain slugs, timezones, and AI sensitivity.
          </p>
        </div>

        <GradientButton size="md" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
          Save Settings
        </GradientButton>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Card */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-maple-400" />
            <span>Organization Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Organization URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Default Corporate Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              >
                <option value="America/Toronto">Eastern Time (America/Toronto / New York)</option>
                <option value="America/Chicago">Central Time (America/Chicago)</option>
                <option value="America/Denver">Mountain Time (America/Denver)</option>
                <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                <option value="Europe/London">GMT / London (Europe/London)</option>
                <option value="Asia/Kolkata">India Standard Time (Asia/Kolkata)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branding & Palette Preview */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Maple Brand Palette Direction</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#00DC82]/10 border border-[#00DC82]/30 text-center">
              <div className="w-8 h-8 rounded-lg bg-[#00DC82] mx-auto mb-2 shadow-glow-sm" />
              <span className="font-bold text-[#00DC82] block">#00DC82</span>
              <span className="text-[10px] text-slate-400">Primary Maple Green</span>
            </div>

            <div className="p-3 rounded-xl bg-[#081426] border border-slate-700 text-center">
              <div className="w-8 h-8 rounded-lg bg-[#081426] border border-slate-600 mx-auto mb-2" />
              <span className="font-bold text-slate-200 block">#081426</span>
              <span className="text-[10px] text-slate-400">Dark Navy Base</span>
            </div>

            <div className="p-3 rounded-xl bg-[#050505] border border-slate-800 text-center">
              <div className="w-8 h-8 rounded-lg bg-[#050505] border border-slate-700 mx-auto mb-2" />
              <span className="font-bold text-slate-200 block">#050505</span>
              <span className="text-[10px] text-slate-400">Deep Black Canvas</span>
            </div>

            <div className="p-3 rounded-xl bg-[#101D2F] border border-slate-700 text-center">
              <div className="w-8 h-8 rounded-lg bg-[#101D2F] border border-slate-600 mx-auto mb-2" />
              <span className="font-bold text-slate-200 block">#101D2F</span>
              <span className="text-[10px] text-slate-400">Elevated Surface</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
