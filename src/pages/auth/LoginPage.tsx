import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { GradientButton } from '../../components/ui/Button';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC<{
  onNavigate: (path: string) => void;
  onLoginSuccess: () => void;
}> = ({ onNavigate, onLoginSuccess }) => {
  const { signInWithEmail } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    const res = await signInWithEmail(email, password);
    if (res.success) {
      showToast('success', 'Signed In', 'Welcome back to MapleBot.');
      onLoginSuccess();
    } else {
      showToast('error', 'Authentication Failed', res.error || 'Invalid credentials.');
    }
    setIsLoading(false);
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

        {/* Auth Card */}
        <div className="glass-card p-6 sm:p-8 border border-slate-800 space-y-6 shadow-2xl">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold text-white">Welcome back</h2>
            <p className="text-xs text-slate-400">Sign in with your corporate email and password.</p>
          </div>

          {/* Form */}
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
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => onNavigate('/forgot-password')}
                  className="text-[11px] text-maple-400 hover:text-maple-300"
                >
                  Forgot password?
                </button>
              </div>
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

            <GradientButton
              type="submit"
              isLoading={isLoading}
              className="w-full py-2.5 mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </GradientButton>
          </form>

          {/* Links */}
          <div className="text-center pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Need an account? </span>
            <button
              onClick={() => onNavigate('/register')}
              className="text-maple-400 hover:text-maple-300 font-semibold"
            >
              Register your email
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <button
            onClick={() => onNavigate('/')}
            className="text-xs text-slate-500 hover:text-slate-300 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
