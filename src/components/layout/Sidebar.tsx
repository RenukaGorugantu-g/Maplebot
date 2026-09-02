import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import {
  Home,
  CheckSquare,
  Users,
  AlertTriangle,
  BarChart2,
  FileSpreadsheet,
  Heart,
  Sparkles,
  Settings,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  ListOrdered,
  Award,
  Table,
  CalendarDays,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { profile, currentRole, userPod } = useAuth();

  // Role-Based Section Definitions
  const memberSections = [
    {
      title: 'Personal',
      items: [
        { label: 'Home', path: '/', icon: <Home className="w-4 h-4" /> },
        { label: 'Work Performance Table', path: '/performance', icon: <Table className="w-4 h-4 text-maple-400" /> },
        { label: 'Leave Planner & Holidays', path: '/leave-planner', icon: <CalendarDays className="w-4 h-4 text-emerald-400" /> },
        { label: 'My Check-in', path: '/updates/my-update', icon: <CheckSquare className="w-4 h-4" /> },
        { label: 'My Updates', path: '/updates/history', icon: <ListOrdered className="w-4 h-4" /> },
        { label: 'My Blockers', path: '/blockers', icon: <AlertTriangle className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Recognition',
      items: [
        { label: 'Kudos', path: '/recognition/kudos', icon: <Heart className="w-4 h-4" /> },
      ],
    },
  ];

  const managerSections = [
    {
      title: `${userPod?.name || 'Pod'} Cockpit`,
      items: [
        { label: 'Overview', path: '/', icon: <Home className="w-4 h-4" /> },
        { label: 'Work Performance (17 Cols)', path: '/performance', icon: <Table className="w-4 h-4 text-maple-400" /> },
        { label: 'Leave Planner & Holidays', path: '/leave-planner', icon: <CalendarDays className="w-4 h-4 text-emerald-400" /> },
        { label: 'Team Updates', path: '/updates/team', icon: <Users className="w-4 h-4" /> },
        { label: 'Check-ins', path: '/updates/my-update', icon: <CheckSquare className="w-4 h-4" /> },
        { label: 'Blockers', path: '/blockers', icon: <AlertTriangle className="w-4 h-4" /> },
        { label: 'My Pod Roster', path: '/manager/team', icon: <Layers className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Intelligence & Reports',
      items: [
        { label: 'Pod Analytics', path: '/analytics/daily', icon: <BarChart2 className="w-4 h-4" /> },
        { label: 'Pod Reports', path: '/reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { label: 'Maple AI', path: '/ai', icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Recognition',
      items: [
        { label: 'Kudos', path: '/recognition/kudos', icon: <Heart className="w-4 h-4" /> },
      ],
    },
  ];

  const adminSections = [
    {
      title: 'Executive Overview',
      items: [
        { label: 'Overview', path: '/', icon: <Home className="w-4 h-4" /> },
        { label: 'Work Performance Table (17 Cols)', path: '/performance', icon: <Table className="w-4 h-4 text-maple-400" /> },
        { label: 'Leave Planner & Holidays', path: '/leave-planner', icon: <CalendarDays className="w-4 h-4 text-emerald-400" /> },
        { label: 'Team Updates', path: '/updates/team', icon: <Users className="w-4 h-4" /> },
        { label: 'Check-ins', path: '/admin/checkins', icon: <CheckSquare className="w-4 h-4" /> },
        { label: 'Blockers', path: '/blockers', icon: <AlertTriangle className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Analytics & Reporting',
      items: [
        { label: 'Analytics', path: '/analytics/daily', icon: <BarChart2 className="w-4 h-4" /> },
        { label: 'Reports', path: '/reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { label: 'Sprints', path: '/analytics/sprint', icon: <TrendingUp className="w-4 h-4" /> },
        { label: 'Maple AI', path: '/ai', icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Organization Control',
      items: [
        { label: 'Members', path: '/admin/members', icon: <Users className="w-4 h-4" /> },
        { label: 'Pods', path: '/admin/pods', icon: <Layers className="w-4 h-4" /> },
        { label: 'Google Chat', path: '/admin/google-chat', icon: <MessageSquare className="w-4 h-4" /> },
        { label: 'Settings', path: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Recognition',
      items: [
        { label: 'Kudos', path: '/recognition/kudos', icon: <Heart className="w-4 h-4" /> },
      ],
    },
  ];

  const activeSections =
    currentRole === 'admin'
      ? adminSections
      : currentRole === 'manager'
      ? managerSections
      : memberSections;

  return (
    <aside
      className={`sticky top-0 h-screen flex-shrink-0 z-30 flex flex-col bg-[#081426] border-r border-slate-800/80 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-[#060F1D]">
        <div
          onClick={() => onNavigate('/')}
          className={`flex items-center gap-3 cursor-pointer select-none ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-maple-400 to-maple-600 flex items-center justify-center shadow-glow-sm flex-shrink-0">
            <span className="text-slate-950 font-black text-lg">M</span>
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold text-white tracking-tight block truncate">
                MapleBot
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 truncate">
                Maple Learning Solutions
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-slate-800/40">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {activeSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <h5 className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {section.title}
              </h5>
            )}
            {section.items.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                    isActive
                      ? 'bg-[#101D2F] text-white border-l-2 border-maple-500 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <span className={`${isActive ? 'text-maple-400' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!isCollapsed && isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-maple-400" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-[#060F1D]">
        <div
          onClick={() => onNavigate('/profile')}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="sm" status="online" />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-white block truncate">{profile?.full_name || 'Team Member'}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {currentRole === 'admin' ? 'Organization Admin' : currentRole === 'manager' ? 'Pod Lead' : 'Team Member'}
                </span>
                {userPod && (
                  <span className="text-[10px] text-maple-400 font-medium truncate">
                    • {userPod.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
