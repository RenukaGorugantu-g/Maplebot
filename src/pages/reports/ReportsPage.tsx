import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportsService } from '../../services/reportsService';
import { dataStore } from '../../services/dataStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button, GradientButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ShieldAlert
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentRole, userPod, profile } = useAuth();
  const isManager = currentRole === 'manager';
  const isAdmin = currentRole === 'admin';

  // Access Control: Only Pod Leads and Admins can see reports
  if (!isManager && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto glass-card p-12 text-center space-y-4 border border-slate-800 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Restricted Access to Reports</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Standup summary reports and XLSX data exports are reserved for Pod Leads and Organization Administrators. Team members can view and submit their updates under My Check-in and Team Updates.
        </p>
      </div>
    );
  }

  // Strict pod scoping: Managers can ONLY see their own pod
  const podIdForScope = isManager ? (userPod?.id || profile?.pod_id || 'pod-web-sales') : '';

  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'sprint' | 'custom'>('daily');
  const [selectedPod, setSelectedPod] = useState<string>(podIdForScope);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [hasBlockerOnly, setHasBlockerOnly] = useState<boolean>(false);

  const pods = dataStore.getPods();
  const effectivePodId = isManager ? podIdForScope : (selectedPod || undefined);
  const members = dataStore.getProfiles().filter((m) => !effectivePodId || m.pod_id === effectivePodId);

  const reportData = reportsService.generateReportData({
    reportType,
    podId: effectivePodId,
    profileId: selectedMember || undefined,
    status: selectedStatus || undefined,
    hasBlocker: hasBlockerOnly ? true : undefined,
  });

  const handleExportXLSX = () => {
    reportsService.exportToXLSX(reportData, `MapleBot_${reportType.toUpperCase()}_Report`);
  };

  const handleExportCSV = () => {
    reportsService.exportToCSV(reportData, `MapleBot_${reportType.toUpperCase()}_Report`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="glass-card p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {isManager ? `${userPod?.name || 'Pod'} Reports` : 'Enterprise Data Export'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isManager ? `${userPod?.name || 'Pod'} Standup Reports` : 'Reports & Excel Exports'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {isManager
              ? `Real-time standup exports strictly scoped to your pod (${userPod?.name || 'Assigned Pod'}).`
              : 'Download organization-wide XLSX spreadsheets or CSV data feeds.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <GradientButton
            size="sm"
            onClick={handleExportXLSX}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Download XLSX (.xlsx)
          </GradientButton>
        </div>
      </div>

      {/* Filter Controls & Report Type Tabs */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        {/* Report Types Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          {[
            { id: 'daily', label: 'Daily Standup Report' },
            { id: 'weekly', label: 'Weekly Executive Report' },
            { id: 'sprint', label: 'Sprint 56 Summary' },
            { id: 'custom', label: 'Custom Filtered Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                reportType === tab.id
                  ? 'bg-maple-500/20 text-maple-300 border border-maple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {isAdmin && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by Pod</label>
              <select
                value={selectedPod}
                onChange={(e) => setSelectedPod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
              >
                <option value="">All Pods ({pods.length})</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by Member</label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
            >
              <option value="">{isManager ? `All ${userPod?.name || 'Pod'} Members` : 'All Members'} ({members.length})</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500/50 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={hasBlockerOnly}
                onChange={(e) => setHasBlockerOnly(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-maple-500 focus:ring-maple-500/30"
              />
              <span>Only show active blockers</span>
            </label>
          </div>
        </div>
      </div>

      {/* Report Table Preview */}
      <div className="glass-card p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Report Data Preview ({reportData.length} entries)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live records ready for export.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>
            Print / PDF
          </Button>
        </div>

        {reportData.length === 0 ? (
          <EmptyState
            title="No records found"
            description="No standup updates match the current report filter criteria."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">Pod</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Yesterday</th>
                  <th className="py-3 px-4 font-semibold">Today</th>
                  <th className="py-3 px-4 font-semibold">Blocker</th>
                  <th className="py-3 px-4 font-semibold text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{row.update_date}</td>
                    <td className="py-3 px-4 text-white font-medium">{row.profile?.full_name || 'Member'}</td>
                    <td className="py-3 px-4 text-slate-400">{row.pod?.name || 'Pod'}</td>
                    <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={row.yesterday}>{row.yesterday}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={row.today}>{row.today}</td>
                    <td className="py-3 px-4 text-rose-300">{row.blocker || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-maple-400">{row.progress_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
