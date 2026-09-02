// ==============================================================================
// MapleBot: Warm Personalized Greeting & Affirmation Banner
// Uplifting, motivational messages when logging in or submitting daily check-ins
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Sparkles,
  Heart,
  Smile,
  Zap,
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface WarmGreetingBannerProps {
  actionLabel?: string;
  onActionClick?: () => void;
  variant?: 'dashboard' | 'checkin' | 'performance';
  customSubtext?: string;
}

const WARM_AFFIRMATIONS = [
  "Your dedication and hard work make a huge difference every single day! 🌟",
  "Every deliverable you finish moves our entire team forward. You've got this! 🚀",
  "Great things are built one thoughtful task at a time. Have a wonderful and productive day! ✨",
  "Thank you for bringing your energy, creativity, and focus today! 💡",
  "Celebrate your progress—every single achievement matters! 🎉",
  "Focus on quality and take pride in what you build. We appreciate you! 🏆",
];

export const WarmGreetingBanner: React.FC<WarmGreetingBannerProps> = ({
  actionLabel,
  onActionClick,
  variant = 'dashboard',
  customSubtext,
}) => {
  const { profile, currentRole } = useAuth();
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Extract first name
  const fullName = profile?.full_name || 'Team Member';
  const firstName = fullName.split(' ')[0] || fullName;

  // Determine time-of-day greeting & icon
  const getGreetingDetails = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Good morning',
        icon: <Sunrise className="w-5 h-5 text-amber-400 animate-pulse" />,
        theme: 'from-amber-500/15 via-emerald-500/10 to-transparent',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: 'Good afternoon',
        icon: <Sun className="w-5 h-5 text-yellow-400 animate-pulse" />,
        theme: 'from-sky-500/15 via-emerald-500/10 to-transparent',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        greeting: 'Good evening',
        icon: <Sunset className="w-5 h-5 text-orange-400" />,
        theme: 'from-purple-500/15 via-amber-500/10 to-transparent',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      };
    } else {
      return {
        greeting: 'Welcome back',
        icon: <Moon className="w-5 h-5 text-indigo-400" />,
        theme: 'from-indigo-500/15 via-emerald-500/10 to-transparent',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      };
    }
  };

  const { greeting, icon, theme, badge } = getGreetingDetails();

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const nextAffirmation = () => {
    setCurrentAffirmationIndex((prev) => (prev + 1) % WARM_AFFIRMATIONS.length);
  };

  return (
    <div className={`glass-card p-5 lg:p-6 border border-slate-800 bg-gradient-to-r ${theme} shadow-2xl relative overflow-hidden`}>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          {/* Greeting & Time Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${badge}`}>
              {icon}
              {greeting}, {firstName}!
            </span>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-maple-400" />
              <span>{todayStr}</span>
              <span className="text-slate-600">•</span>
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-emerald-300 font-bold">{currentTimeStr}</span>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-lg lg:text-xl font-semibold text-white tracking-normal">
            {variant === 'checkin'
              ? 'Ready to share your wins and daily progress?'
              : variant === 'performance'
              ? 'Work Performance & Deliverables Workspace'
              : `Welcome to MapleBot, ${firstName}!`}
          </h2>

          {/* Warm Affirmation Subtext */}
          <p className="text-sm font-medium text-slate-200 flex items-center gap-2 max-w-2xl leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{customSubtext || WARM_AFFIRMATIONS[currentAffirmationIndex]}</span>
            <button
              onClick={nextAffirmation}
              className="text-xs text-slate-400 hover:text-maple-300 transition-colors ml-1"
              title="Click for another uplifting thought"
            >
              🔄
            </button>
          </p>
        </div>

        {/* Optional Action Button */}
        {actionLabel && onActionClick && (
          <div className="flex items-center gap-3">
            <button
              onClick={onActionClick}
              className="px-5 py-2.5 rounded-xl text-xs lg:text-sm font-bold bg-gradient-to-r from-maple-500 to-emerald-500 text-slate-950 hover:opacity-95 transition-all shadow-glow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
