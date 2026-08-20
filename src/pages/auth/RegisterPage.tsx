import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { GradientButton } from '../../components/ui/Button';
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC<{
  onNavigate: (path: string) => void;
  onRegisterSuccess: () => void;
}> = ({ onNavigate, onRegisterSuccess }) => {
  const { signUpWithEmail } = useAuth();
  const { showToast } = useNotifications();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      showToast('error', 'Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const res = await signUpWithEmail(email, password, fullName);
    if (res.success) {
      showToast('success', 'Account Created', 'Welcome to MapleBot workspace.');
      onRegisterSuccess();
    } else {
      showToast('error', 'Registration Failed', res.error || 'Unable to create account.');
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
            <h2 className="text-lg font-bold text-white">Create your MapleBot account</h2>
            <p className="text-xs text-slate-400">Enter your corporate email and password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
              <label className="font-semibold text-slate-300">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500/50"
                />
              </div>
            </div>

            <GradientButton
              type="submit"
              isLoading={isLoading}
              className="w-full py-2.5 mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account
            </GradientButton>
          </form>

          {/* Link to Login */}
          <div className="text-center pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Already have an account? </span>
            <button
              onClick={() => onNavigate('/login')}
              className="text-maple-400 hover:text-maple-300 font-semibold"
            >
              Sign in
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
