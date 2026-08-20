import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { updatesService } from '../../services/updatesService';
import { MetricCard } from '../../components/ui/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

export const DailyAnalyticsPage: React.FC = () => {
  const { currentRole, userPod } = useAuth();
  const isManager = currentRole === 'manager';

  const stats = updatesService.getSubmissionStats();
  const dailyData = analyticsService.getDailyAnalytics();

  const customTooltipStyle = {
    backgroundColor: '#081426',
    borderColor: '#1e293b',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '12px',
  };

  const displayedPodStats = isManager && userPod
    ? dailyData.podStats.filter((p) => p.name.toLowerCase().includes(userPod.name.toLowerCase()) || userPod.name.toLowerCase().includes(p.name.toLowerCase()))
    : dailyData.podStats;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-maple-400">
            {isManager ? `${userPod?.name || 'Pod'} Intelligence` : 'Organization Intelligence'}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          {isManager ? `${userPod?.name || 'Pod'} Standup Analytics` : 'Daily Standup Analytics'}
        </h2>
        <p className="text-xs text-slate-300 mt-0.5">
          Real-time metrics on team participation, blocker densities, and velocity.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Submission Rate"
          value={`${stats.participationRate}%`}
          subtitle={`${stats.submittedCount} of ${stats.totalExpected} completed`}
          progress={stats.participationRate}
          icon={<TrendingUp className="w-5 h-5 text-maple-400" />}
        />
        <MetricCard
          title="Total Submissions"
          value={stats.submittedCount}
          subtitle="Recorded today"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Pending Check-ins"
          value={stats.pendingCount}
          subtitle="Awaiting response"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Active Blockers"
          value={stats.activeBlockers}
          subtitle="Open impediments"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Bar Chart */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Standup Participation (%)</h3>
            <span className="text-xs text-maple-400 font-semibold">Today</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedPodStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="rate" fill="#00DC82" radius={[6, 6, 0, 0]} name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Donut */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Status Distribution</h3>
            <span className="text-xs text-slate-400">Current Cycle</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dailyData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dailyData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs pt-2 border-t border-slate-800/60">
            {dailyData.statusDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300">{item.name}: <strong className="text-white">{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
