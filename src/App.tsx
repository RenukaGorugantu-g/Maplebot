import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/Button';

// Public & Auth Pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { PendingOrgPage } from './pages/auth/PendingOrgPage';

// Authenticated Application Pages
import { HomeDashboard } from './pages/dashboard/HomeDashboard';
import { MyUpdatePage } from './pages/updates/MyUpdatePage';
import { TeamUpdatesPage } from './pages/updates/TeamUpdatesPage';
import { UpdateHistoryPage } from './pages/updates/UpdateHistoryPage';
import { ManagerTeamPage } from './pages/manager/ManagerTeamPage';
import { BlockersPage } from './pages/blockers/BlockersPage';
import { KudosPage } from './pages/kudos/KudosPage';
import { KudosLeaderboardPage } from './pages/kudos/KudosLeaderboardPage';
import { MapleAIPage } from './pages/ai/MapleAIPage';
import { DailyAnalyticsPage } from './pages/analytics/DailyAnalyticsPage';
import { WeeklyAnalyticsPage } from './pages/analytics/WeeklyAnalyticsPage';
import { SprintAnalyticsPage } from './pages/analytics/SprintAnalyticsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { PerformanceModulePage } from './pages/performance/PerformanceModulePage';
import { LeavePlannerPage } from './pages/leaves/LeavePlannerPage';
import { MembersPage } from './pages/admin/MembersPage';
import { PodsPage } from './pages/admin/PodsPage';
import { CheckinsPage } from './pages/admin/CheckinsPage';
import { GoogleChatPage } from './pages/admin/GoogleChatPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

// Access Denied Guard Component
const AccessDenied: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <div className="glass-card p-8 border border-rose-800/40 text-center max-w-lg mx-auto space-y-4 my-12">
    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
      <ShieldAlert className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-bold text-white">Access Restricted</h3>
    <p className="text-xs text-slate-300">
      You do not have permission to view this resource. This section is restricted to organization administrators and pod leads.
    </p>
    <div className="pt-2">
      <Button variant="secondary" size="sm" onClick={() => onNavigate('/')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
        Return to Home
      </Button>
    </div>
  </div>
);

export const App: React.FC = () => {
  const { isAuthenticated, currentRole, isAssignedToOrg, userPod, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [selectedPodId, setSelectedPodId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Loading State (Prevent Flash of Unauthenticated/Protected Content)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-maple-400 to-maple-600 flex items-center justify-center mx-auto shadow-glow-md animate-pulse">
            <span className="text-slate-950 font-black text-xl">M</span>
          </div>
          <span className="text-xs font-semibold text-slate-400 block tracking-wider uppercase">
            Loading MapleBot...
          </span>
        </div>
      </div>
    );
  }

  // 2. Public Authentication Routes (Always Available)
  if (currentPath === '/login') {
    if (isAuthenticated) {
      return (
        <AppLayout currentPath="/" onNavigate={navigate}>
          <HomeDashboard onNavigate={navigate} />
        </AppLayout>
      );
    }
    return <LoginPage onNavigate={navigate} onLoginSuccess={() => navigate('/')} />;
  }

  if (currentPath === '/register') {
    if (isAuthenticated) {
      return (
        <AppLayout currentPath="/" onNavigate={navigate}>
          <HomeDashboard onNavigate={navigate} />
        </AppLayout>
      );
    }
    return <RegisterPage onNavigate={navigate} onRegisterSuccess={() => navigate('/')} />;
  }

  if (currentPath === '/forgot-password') {
    return <ForgotPasswordPage onNavigate={navigate} />;
  }

  if (currentPath === '/reset-password') {
    return <ResetPasswordPage onNavigate={navigate} />;
  }

  // 3. Public Landing Page if Unauthenticated on Root
  if (!isAuthenticated && (currentPath === '/' || currentPath === '/landing')) {
    return <LandingPage onNavigate={navigate} />;
  }

  // 4. If Unauthenticated and Attempting Protected Route -> Redirect to Login
  if (!isAuthenticated) {
    return <LoginPage onNavigate={navigate} onLoginSuccess={() => navigate('/')} />;
  }

  // 5. If Authenticated but Awaiting Org Assignment
  if (!isAssignedToOrg) {
    return <PendingOrgPage />;
  }

  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';
  const isMember = currentRole === 'member';

  // 6. Authenticated Role-Aware Route Dispatcher
  const renderContent = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard':
        return <HomeDashboard onNavigate={navigate} selectedPodId={selectedPodId} />;
      case '/updates/my-update':
        return <MyUpdatePage onNavigate={navigate} />;
      case '/updates/team':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <TeamUpdatesPage onNavigate={navigate} selectedPodId={isManager ? userPod?.id : selectedPodId} />;
      case '/updates/history':
        return <UpdateHistoryPage onNavigate={navigate} />;
      case '/manager/team':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <ManagerTeamPage onNavigate={navigate} />;
      case '/blockers':
        return <BlockersPage onNavigate={navigate} selectedPodId={isManager ? userPod?.id : selectedPodId} />;
      case '/recognition/kudos':
        return <KudosPage onNavigate={navigate} />;
      case '/recognition/leaderboard':
        return <KudosLeaderboardPage onNavigate={navigate} />;
      case '/ai':
        return <MapleAIPage onNavigate={navigate} />;
      case '/analytics/daily':
      case '/analytics/weekly':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <DailyAnalyticsPage />;
      case '/analytics/sprint':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <SprintAnalyticsPage onNavigate={navigate} />;
      case '/reports':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <ReportsPage />;
      case '/performance':
      case '/work-performance':
      case '/performance/dashboard':
      case '/performance/work-data':
      case '/performance/individual':
      case '/performance/team':
      case '/performance/kpis':
      case '/performance/history':
        return <PerformanceModulePage />;
      case '/leaves':
      case '/leave-planner':
      case '/holidays':
        return <LeavePlannerPage onNavigate={navigate} />;
      case '/admin/members':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <MembersPage />;
      case '/admin/pods':
        if (isMember) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <PodsPage onNavigate={navigate} />;
      case '/admin/checkins':
        if (!isAdmin) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <CheckinsPage />;
      case '/admin/google-chat':
        if (!isAdmin) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <GoogleChatPage />;
      case '/admin/settings':
        if (!isAdmin) {
          return <AccessDenied onNavigate={navigate} />;
        }
        return <SettingsPage />;
      case '/profile':
        return <ProfilePage />;
      case '/landing':
        return <LandingPage onNavigate={navigate} />;
      default:
        return <HomeDashboard onNavigate={navigate} selectedPodId={selectedPodId} />;
    }
  };

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={navigate}
      selectedPodId={selectedPodId}
      onSelectPodId={setSelectedPodId}
    >
      {renderContent()}
    </AppLayout>
  );
};
