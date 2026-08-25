import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { GradientButton } from '../../components/ui/Button';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ResetPasswordPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { updatePassword, profile } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState(
    profile?.email || localStorage.getItem('maplebot_pending_reset_email') || localStorage.getItem('maplebot_session_email') || ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('error', 'Missing Information', 'Please provide your email and new password.');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const res = await updatePassword(password, email);
    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      showToast('success', 'Password Updated', 'Your new password has been set across your devices.');
    } else {
      showToast('error', 'Error', res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-maple-500/30">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div
            onClick={() => onNavigate('/')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-maple-400 to-maple-600 flex items-center justify-center mx-auto shadow-glow-md cursor-pointer"
          >
            <span className="text-slate-950 font-black text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">MapleBot</h1>
          <p className="text-xs text-slate-400">Maple Learning Solutions</p>
        </div>

        <div className="glass-card p-6 sm:p-8 border border-slate-800 space-y-6 shadow-2xl">
          {isSuccess ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Password Updated</h3>
                <p className="text-xs text-slate-400">
                  Your new password is now active. You can sign in with your corporate email and new password.
                </p>
              </div>
              <div className="pt-2">
                <GradientButton size="md" onClick={() => onNavigate('/login')} className="w-full">
                  Continue to Sign In
                </GradientButton>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-white">Set new password</h2>
                <p className="text-xs text-slate-400">Create a secure password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Corporate Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="renuka@maplelearningsolutions.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500/50"
                    />
                  </div>
                </div>

                <GradientButton
                  type="submit"
                  isLoading={isLoading}
                  className="w-full py-2.5 mt-2"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Update Password
                </GradientButton>
              </form>

              <div className="text-center pt-2 border-t border-slate-800 text-xs">
                <button
                  onClick={() => onNavigate('/login')}
                  className="text-slate-400 hover:text-maple-400 font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
