import React from 'react';
import { analyticsService } from '../../services/analyticsService';
import { dataStore } from '../../services/dataStore';
import { MetricCard } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Layers, Target, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export const SprintAnalyticsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const sprintData = analyticsService.getSprintAnalytics();
  const sprint = dataStore.getSprint();

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
      <div className="glass-card p-6 lg:p-8 border border-slate-800 bg-gradient-to-r from-[#081426] via-[#0B1728] to-[#101D2F]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-maple-400">
            Sprint Execution Intelligence
          </span>
          <span className="text-slate-600">•</span>
          <StatusBadge status="active" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{sprint.name}</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl">{sprint.description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span>Start: <strong className="text-white">{sprint.start_date}</strong></span>
          <span>•</span>
          <span>End: <strong className="text-white">{sprint.end_date}</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sprint Participation"
          value={`${sprint.participation_rate}%`}
          subtitle="Standup consistency"
          progress={sprint.participation_rate}
          icon={<Target className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Standup Updates"
          value={sprint.total_updates || 54}
          subtitle="Logged this sprint"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Sprint Blockers"
          value={sprint.blockers_count || 4}
          subtitle={`${sprint.resolved_blockers_count || 3} resolved`}
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Sprint Recognition"
          value={sprint.kudos_count || 14}
          subtitle="Kudos awarded"
          icon={<Sparkles className="w-5 h-5 text-purple-400" />}
        />
      </div>

      {/* Sprint Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burnup Chart */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Sprint Deliverable Burnup</h3>
            <span className="text-xs text-maple-400 font-semibold">On Track</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sprintData.burnupData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="completedPoints" stroke="#00DC82" strokeWidth={3} name="Completed Deliverables" />
                <Line type="monotone" dataKey="target" stroke="#64748b" strokeDasharray="4 4" name="Target Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pod Velocity Breakdown */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Deliverables Completed by Pod</h3>
            <span className="text-xs text-slate-400">Sprint 56</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sprintData.podVelocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="pod" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend />
                <Bar dataKey="completed" fill="#00DC82" radius={[6, 6, 0, 0]} name="Completed" />
                <Bar dataKey="inProgress" fill="#3B82F6" radius={[6, 6, 0, 0]} name="In Progress" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
