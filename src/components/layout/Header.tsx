import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui/Avatar';
import {
  Menu,
  Bell,
  Search,
  Sparkles,
  User,
  LogOut
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
  selectedPodId?: string;
  onSelectPodId?: (id: string | undefined) => void;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  onOpenSearch,
  toggleSidebar,
}) => {
  const { profile, currentRole, signOut, userPod } = useAuth();
  const { unreadCount } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const getPageTitle = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard':
        return currentRole === 'admin'
          ? 'Organization Overview'
          : currentRole === 'manager'
          ? `${userPod?.name || 'Pod'} — Team Overview`
          : `Good morning, ${(profile?.full_name || 'Team Member').split(' ')[0]}`;
      case '/manager/team':
        return `${userPod?.name || 'Pod'} — Team Roster`;
      case '/updates/my-update':
        return 'Today\'s Standup Check-in';
      case '/updates/team':
        return currentRole === 'manager' ? `${userPod?.name || 'Pod'} Team Updates` : 'Organization Team Updates';
      case '/updates/history':
        return 'My Updates';
      case '/blockers':
        return currentRole === 'member' ? 'My Blockers & Impediments' : `${userPod?.name || 'Team'} Blockers`;
      case '/recognition/kudos':
        return 'Team Kudos & Recognition';
      case '/recognition/leaderboard':
        return 'Kudos Leaderboard';
      case '/ai':
        return 'Maple AI Assistant';
      case '/analytics/daily':
      case '/analytics/weekly':
      case '/analytics/sprint':
        return currentRole === 'manager' ? `${userPod?.name || 'Pod'} Analytics` : 'Organization Analytics';
      case '/reports':
        return currentRole === 'manager' ? `${userPod?.name || 'Pod'} Reports` : 'Organization Reports';
      case '/admin/members':
        return 'Team Members Directory';
      case '/admin/pods':
        return 'Pods & Department Architecture';
      case '/admin/checkins':
        return 'Standup Schedules & Questions';
      case '/admin/google-chat':
        return 'Google Chat Integration';
      case '/admin/settings':
        return 'Organization Settings';
      case '/profile':
        return 'My Profile';
      default:
        return 'MapleBot';
    }
  };

  const getContextSubtitle = () => {
    if (currentRole === 'admin') {
      return 'Maple Learning Solutions • All Departments';
    }
    if (currentRole === 'manager') {
      return `${userPod?.name || 'Pod'} • Pod Lead`;
    }
    return `${userPod?.name || 'Maple Learning Solutions'} • Team Member`;
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#050505]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
      {/* Left Title & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base lg:text-lg font-bold text-white tracking-tight">
            {getPageTitle()}
          </h1>
          <span className="hidden sm:block text-[11px] text-slate-400">
            {getContextSubtitle()}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-800 rounded border border-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* Quick Maple AI CTA */}
        <button
          onClick={() => onNavigate('/ai')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-maple-500/10 hover:bg-maple-500/20 text-maple-300 border border-maple-500/30 text-xs font-semibold transition-all shadow-glow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-maple-400" />
          <span>Ask Maple AI</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-maple-400 ring-2 ring-[#050505] animate-pulse" />
            )}
          </button>
          <NotificationDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            onNavigate={onNavigate}
          />
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
          >
            <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="sm" status="online" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#081426] border border-slate-700/80 shadow-2xl p-3 space-y-3 z-50 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-slate-800">
                <span className="font-bold text-white text-xs block truncate">{profile?.full_name || 'Member'}</span>
                <span className="text-[11px] text-slate-400 block truncate">{profile?.email || ''}</span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-maple-500/10 text-maple-400 border border-maple-500/20">
                    {currentRole === 'admin' ? 'Admin' : currentRole === 'manager' ? 'Pod Lead' : 'Member'}
                  </span>
                  {userPod && (
                    <span className="text-[10px] text-slate-300 font-medium truncate">
                      {userPod.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-left transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left transition-colors text-xs font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
