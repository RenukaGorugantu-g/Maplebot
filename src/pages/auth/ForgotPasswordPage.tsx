import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { GradientButton, Button } from '../../components/ui/Button';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { resetPasswordForEmail } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    const res = await resetPasswordForEmail(email);
    setIsLoading(false);

    if (res.success) {
      setIsSubmitted(true);
      showToast('success', 'Reset Link Dispatched', 'Check your inbox for password reset instructions.');
    } else {
      showToast('error', 'Error', res.error || 'Failed to send reset link.');
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

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 border border-slate-800 space-y-6 shadow-2xl">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Reset Link Sent</h3>
                <p className="text-xs text-slate-400">
                  If an account exists for <strong className="text-white">{email}</strong>, we have dispatched a password reset link to your inbox.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="secondary" size="md" onClick={() => onNavigate('/login')} className="w-full">
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-white">Reset your password</h2>
                <p className="text-xs text-slate-400">
                  Enter your email address and we'll send you a recovery link.
                </p>
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

                <GradientButton
                  type="submit"
                  isLoading={isLoading}
                  className="w-full py-2.5 mt-2"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Send Recovery Link
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
