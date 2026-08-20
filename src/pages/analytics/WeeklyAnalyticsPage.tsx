import React from 'react';
import { analyticsService } from '../../services/analyticsService';
import { MetricCard } from '../../components/ui/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Calendar, CheckCircle2, AlertTriangle, Heart, Clock } from 'lucide-react';

export const WeeklyAnalyticsPage: React.FC = () => {
  const weekly = analyticsService.getWeeklyAnalytics();

  const customTooltipStyle = {
    backgroundColor: '#081426',
    borderColor: '#1e293b',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '12px',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
            Weekly Aggregates
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">Current Work Week (Monday – Friday)</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Weekly Performance & Trend Intelligence
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Evaluate team attendance, blocker resolution cycle times, and sprint consistency.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Submission Rate"
          value={`${weekly.averageSubmissionRate}%`}
          subtitle="Target: >85%"
          icon={<Calendar className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Submissions"
          value={weekly.totalSubmissions}
          subtitle="Across 5 days"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Avg Blocker Resolution"
          value={`${weekly.avgResolutionHours} hrs`}
          subtitle="Cycle time to clear"
          icon={<Clock className="w-5 h-5 text-blue-400" />}
        />
        <MetricCard
          title="Kudos Distributed"
          value={weekly.kudosGiven}
          subtitle="Peer recognitions"
          icon={<Heart className="w-5 h-5 text-rose-400" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mon-Fri Daily Submissions vs Expected */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Daily Submissions (Mon – Fri)</h3>
            <span className="text-xs text-slate-400">24 active members</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly.dailySubmissions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 25]} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="submitted" fill="#00DC82" radius={[6, 6, 0, 0]} name="Submitted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blockers Created vs Resolved */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Blocker Lifecycle (Reported vs Resolved)</h3>
            <span className="text-xs text-emerald-400 font-semibold">+2 net resolved</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly.dailySubmissions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="blockers" stroke="#EF4444" strokeWidth={2} name="Reported" />
                <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
