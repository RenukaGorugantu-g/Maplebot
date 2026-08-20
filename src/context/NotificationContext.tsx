import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem } from '../types/database';
import { dataStore } from '../services/dataStore';
import { useAuth } from './AuthContext';

interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  dismissToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const updateNotifs = () => {
      if (!profile) {
        setNotifications([]);
        return;
      }
      // Role-aware notifications
      const list = dataStore.getNotifications(profile.role === 'admin' ? undefined : profile.id);
      setNotifications(list);
    };

    updateNotifs();
    const unsubscribe = dataStore.subscribe(updateNotifs);
    return () => unsubscribe();
  }, [profile?.id, profile?.role]);

  const showToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const markAsRead = (id: string) => {
    dataStore.markNotificationAsRead(id);
  };

  const markAllAsRead = () => {
    if (profile?.id) {
      dataStore.markAllNotificationsAsRead(profile.id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
