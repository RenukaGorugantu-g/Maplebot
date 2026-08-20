import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GradientButton, Button } from '../../components/ui/Button';
import {
  CheckSquare,
  Users,
  AlertTriangle,
  BarChart2,
  FileSpreadsheet,
  Heart,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Menu,
  X,
  Lock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export const LandingPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { isAuthenticated, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 selection:bg-maple-500/30">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-maple-400 to-maple-600 flex items-center justify-center shadow-glow-sm">
              <span className="text-slate-950 font-black text-lg">M</span>
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block">MapleBot</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Maple Learning Solutions</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('pods')} className="hover:text-white transition-colors">
              For Teams
            </button>
            <button onClick={() => scrollToSection('ai')} className="hover:text-white transition-colors">
              Maple AI
            </button>
          </nav>

          {/* Header Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onNavigate('/profile')}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  {profile?.full_name}
                </button>
                <GradientButton
                  size="sm"
                  onClick={() => onNavigate('/')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Go to Dashboard
                </GradientButton>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('/login')}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign In
                </button>
                <GradientButton
                  size="sm"
                  onClick={() => onNavigate('/register')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get Started
                </GradientButton>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden p-4 bg-[#081426] border-b border-slate-800 space-y-3 text-xs">
            <button
              onClick={() => scrollToSection('features')}
              className="w-full text-left py-2 text-slate-300 hover:text-white"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left py-2 text-slate-300 hover:text-white"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pods')}
              className="w-full text-left py-2 text-slate-300 hover:text-white"
            >
              For Teams
            </button>
            <button
              onClick={() => scrollToSection('ai')}
              className="w-full text-left py-2 text-slate-300 hover:text-white"
            >
              Maple AI
            </button>
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <GradientButton size="sm" onClick={() => onNavigate('/')}>
                    Go to Dashboard
                  </GradientButton>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate('/login')}>
                    Sign In
                  </Button>
                  <GradientButton size="sm" onClick={() => onNavigate('/register')}>
                    Get Started
                  </GradientButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-maple-500/10 border border-maple-500/20 text-maple-400 text-xs font-semibold shadow-glow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Internal Team Coordination & Intelligence Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Stay aligned. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-maple-400">
            Keep work moving.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          MapleBot gives teams a simple way to share daily updates, surface blockers, recognize progress, and understand team performance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {isAuthenticated ? (
            <GradientButton
              size="lg"
              onClick={() => onNavigate('/')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Your Workspace
            </GradientButton>
          ) : (
            <>
              <GradientButton
                size="lg"
                onClick={() => onNavigate('/register')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Get Started
              </GradientButton>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onNavigate('/login')}
              >
                Sign In to Workspace
              </Button>
            </>
          )}
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="pt-10 max-w-5xl mx-auto">
          <div className="glass-card p-4 sm:p-6 border border-slate-700/80 rounded-2xl shadow-2xl space-y-4 text-left">
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-400 ml-2 font-mono">maplebot.internal / workspace</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-maple-500/10 text-maple-400 border border-maple-500/20">
                Live Pod Status
              </span>
            </div>

            {/* Mock KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Participation</span>
                <p className="text-lg font-bold text-white mt-0.5">92%</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Submitted Today</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">18 Completed</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Blockers</span>
                <p className="text-lg font-bold text-rose-400 mt-0.5">2 Open</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Team Velocity</span>
                <p className="text-lg font-bold text-maple-400 mt-0.5">On Track</p>
              </div>
            </div>

            {/* Mock Update Feed Row */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-maple-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                    W
                  </div>
                  <span className="font-semibold text-white">Web & Sales Pod Update</span>
                </div>
                <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  On Track
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <p className="p-2 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-slate-400 block text-[10px] uppercase">Completed</strong>
                  Finalized corporate sales landing page & tested responsive layout.
                </p>
                <p className="p-2 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-maple-400 block text-[10px] uppercase">Today's Focus</strong>
                  Integrating client portal APIs and verifying lead automation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built specifically for internal coordination
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Everything your team needs to stay aligned without meetings and status reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <CheckSquare className="w-5 h-5 text-maple-400" />,
              title: 'Daily Check-ins',
              desc: 'Asynchronous standups structured around your schedule, timezones, and pods.',
            },
            {
              icon: <Users className="w-5 h-5 text-blue-400" />,
              title: 'Team Updates',
              desc: 'Clean unified feed with priorities, completed deliverables, and daily plans.',
            },
            {
              icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
              title: 'Blocker Tracking',
              desc: 'Surface impediments immediately, assign owners, and track resolution timelines.',
            },
            {
              icon: <BarChart2 className="w-5 h-5 text-emerald-400" />,
              title: 'Team Analytics',
              desc: 'Role-aware visibility into pod participation, blockers, and cycle velocities.',
            },
            {
              icon: <FileSpreadsheet className="w-5 h-5 text-purple-400" />,
              title: 'Reports & Exports',
              desc: 'Generate Excel XLSX and CSV reports for management and sprint reviews.',
            },
            {
              icon: <Heart className="w-5 h-5 text-pink-400" />,
              title: 'Kudos & Recognition',
              desc: 'Celebrate cultural values, team support, ownership, and outstanding deliverables.',
            },
            {
              icon: <Sparkles className="w-5 h-5 text-maple-400" />,
              title: 'Maple AI',
              desc: 'Query team progress in plain English with role-authorized access controls.',
            },
            {
              icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
              title: 'Google Chat Alerts',
              desc: 'Broadcast summaries, critical blockers, and kudos directly into Google Chat spaces.',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="glass-card p-6 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-white">{feature.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How MapleBot Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            A simple 3-step rhythm that keeps everyone aligned without meeting fatigue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 border border-slate-800 space-y-4 relative">
            <span className="text-4xl font-black text-slate-800">01</span>
            <h3 className="text-lg font-bold text-white">Team members submit daily updates</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log completed work, current focus, and flag any blockers in under 2 minutes each morning.
            </p>
          </div>

          <div className="glass-card p-8 border border-slate-800 space-y-4 relative">
            <span className="text-4xl font-black text-slate-800">02</span>
            <h3 className="text-lg font-bold text-white">Managers review progress & blockers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pod leads get full visibility into their team's deliverables and follow up on impediments.
            </p>
          </div>

          <div className="glass-card p-8 border border-slate-800 space-y-4 relative">
            <span className="text-4xl font-black text-slate-800">03</span>
            <h3 className="text-lg font-bold text-white">Maple AI summarizes & detects risks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated intelligence extracts key takeaways, identifies subtle blocker patterns, and compiles reports.
            </p>
          </div>
        </div>
      </section>

      {/* Pod Architecture Section */}
      <section id="pods" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Organize work around teams & pods
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Structured hierarchy designed for Maple Learning Solutions functional departments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: 'Web & Sales',
              focus: 'Web platform development, revenue initiatives, and sales conversion.',
            },
            {
              name: 'Marketing',
              focus: 'Brand awareness, digital growth, social media, and content marketing.',
            },
            {
              name: 'eLearning',
              focus: 'Curriculum authoring, instructional design, and LMS courseware.',
            },
            {
              name: 'HR Operations',
              focus: 'Talent recruitment, employee onboarding, policies, and internal culture.',
            },
          ].map((pod, idx) => (
            <div key={idx} className="glass-card p-6 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-maple-500/10 text-maple-400 font-bold flex items-center justify-center text-xs">
                {idx + 1}
              </div>
              <h3 className="text-base font-bold text-white">{pod.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pod.focus}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Maple AI Section */}
      <section id="ai" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="glass-card p-8 lg:p-12 border border-slate-800 rounded-3xl space-y-8 bg-gradient-to-br from-[#081426] via-[#0B1728] to-[#101D2F]">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maple-500/10 text-maple-400 text-xs font-semibold border border-maple-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Permission-Aware AI Companion</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ask Maple AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Get instant answers from your team's updates, blockers, progress, and historical activity. Maple AI strictly respects role-based data permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              '“Who is blocked today?”',
              '“Summarize the Web & Sales pod progress.”',
              '“What are the major impediments this week?”',
              '“Who has not submitted today’s update?”',
              '“What changed during this sprint?”',
              '“Show kudos recognition highlights.”',
            ].map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 font-medium"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Chat Space Integration Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Seamless Google Workspace Delivery
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            MapleBot notifies your team's Google Chat Space with formatted standup summaries and blocker alerts.
          </p>
        </div>

        <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#081426] border border-slate-700/80 shadow-2xl space-y-3 text-left text-xs">
          <div className="flex items-center gap-3 pb-2.5 border-b border-slate-800">
            <div className="w-8 h-8 rounded-full bg-maple-500 text-slate-950 font-black flex items-center justify-center text-xs">
              M
            </div>
            <div>
              <span className="font-bold text-white block">MapleBot — Team Check-in</span>
              <span className="text-[10px] text-slate-400">Google Chat Card Notification</span>
            </div>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            <strong>Web & Sales Update Submitted</strong><br />
            • Status: <span className="text-emerald-400 font-semibold">On Track</span><br />
            • Submitted: 9:42 AM<br />
            • Completed: Finalized sales landing page
          </p>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Bring your team's updates into one place.
        </h2>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          Start your morning with clear visibility, fewer meetings, and faster unblocking.
        </p>
        <div className="pt-2">
          {isAuthenticated ? (
            <GradientButton
              size="lg"
              onClick={() => onNavigate('/')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Go to Dashboard
            </GradientButton>
          ) : (
            <GradientButton
              size="lg"
              onClick={() => onNavigate('/register')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Get Started with MapleBot
            </GradientButton>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-white block">MapleBot</span>
          <span>Maple Learning Solutions Internal SaaS</span>
        </div>
        <div className="flex items-center gap-6 text-slate-400">
          <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
            Features
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
            How It Works
          </button>
          <button onClick={() => onNavigate('/login')} className="hover:text-white transition-colors">
            Sign In
          </button>
        </div>
      </footer>
    </div>
  );
};
