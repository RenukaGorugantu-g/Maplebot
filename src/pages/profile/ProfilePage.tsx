import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { updatesService } from '../../services/updatesService';
import { kudosService } from '../../services/kudosService';
import { Avatar } from '../../components/ui/Avatar';
import { GradientButton } from '../../components/ui/Button';
import {
  User,
  Mail,
  Layers,
  Flame,
  Heart,
  Save
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateCurrentProfile } = useAuth();
  const { showToast } = useNotifications();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Toronto');

  const myUpdates = profile?.id ? updatesService.getUpdates({ profileId: profile.id }) : [];
  const myKudos = profile?.id ? kudosService.getKudos({ recipientId: profile.id }) : [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentProfile({
      full_name: fullName,
      timezone,
    });
    showToast('success', 'Profile Updated', 'Your profile details have been saved.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="glass-card p-6 lg:p-8 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-[#081426] via-[#0B1728] to-[#101D2F]">
        <div className="flex items-center gap-4">
          <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="xl" status="online" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-white tracking-tight">{profile?.full_name || 'Team Member'}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-maple-500/10 text-maple-400 border border-maple-500/20">
                {profile?.role || 'member'}
              </span>
            </div>
            <p className="text-xs text-slate-400">{profile?.email || ''}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-300">
              <span className="font-medium">{profile?.pod?.name || 'Maple Learning Solutions'}</span>
              {profile?.manager && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Reports to {profile.manager.full_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center min-w-[90px]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Streak
            </span>
            <p className="text-base font-extrabold text-white mt-0.5">14 Days</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center min-w-[90px]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 text-pink-400" /> Kudos
            </span>
            <p className="text-base font-extrabold text-white mt-0.5">{myKudos.length}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="glass-card p-6 border border-slate-800 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white mb-2">Personal Settings</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Corporate Email (Read Only)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                readOnly
                disabled
                type="email"
                value={profile?.email || ''}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900/50 border border-slate-800/80 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <GradientButton type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </GradientButton>
        </div>
      </form>
    </div>
  );
};
