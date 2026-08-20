import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, Check, Heart, AlertTriangle, FileText, Calendar } from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'kudos_received':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'blocker_assigned':
      case 'blocker_resolved':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'weekly_report':
      case 'sprint_report':
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <Calendar className="w-4 h-4 text-maple-400" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-modal p-0 border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0B1728]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-maple-400" />
            <h4 className="text-sm font-semibold text-white">Notifications</h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-maple-500 text-slate-950 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-maple-400 hover:text-maple-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 p-1">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.type.includes('blocker')) onNavigate('/blockers');
                  else if (n.type.includes('kudos')) onNavigate('/recognition/kudos');
                  else if (n.type.includes('report')) onNavigate('/reports');
                  else onNavigate('/updates/team');
                  onClose();
                }}
                className={`p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3 ${
                  !n.read ? 'bg-slate-900/80 border-l-2 border-maple-500' : ''
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex-shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-semibold ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
