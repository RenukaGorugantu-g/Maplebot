import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export const PendingOrgPage: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Awaiting Organization Assignment
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account (<strong className="text-white">{profile.email}</strong>) has been authenticated, but has not yet been assigned to a pod or department by an administrator.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 mt-3">
            An administrator at <strong>Maple Learning Solutions</strong> will review your account and assign your pod permissions shortly.
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Check Assignment Status
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign out of {profile.email}
          </Button>
        </div>
      </div>
    </div>
  );
};
