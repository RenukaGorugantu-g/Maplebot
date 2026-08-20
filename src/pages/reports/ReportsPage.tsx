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
  Printer
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentRole, userPod } = useAuth();
  const isManager = currentRole === 'manager';

  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'sprint' | 'custom'>('daily');
  const [selectedPod, setSelectedPod] = useState<string>(isManager && userPod ? userPod.id : '');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [hasBlockerOnly, setHasBlockerOnly] = useState<boolean>(false);

  const pods = dataStore.getPods();
  const members = dataStore.getProfiles().filter((m) => !isManager || m.pod_id === userPod?.id);

  const reportData = reportsService.generateReportData({
    reportType,
    podId: isManager && userPod ? userPod.id : (selectedPod || undefined),
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
            Download XLSX spreadsheets or CSV data feeds.
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
          {!isManager && (
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
              <option value="">All Pod Members ({members.length})</option>
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

          <div className="flex items-end">
            <button
              onClick={() => setHasBlockerOnly(!hasBlockerOnly)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                hasBlockerOnly
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {hasBlockerOnly ? 'Showing: With Blockers Only' : 'Show Only Blockers'}
            </button>
          </div>
        </div>
      </div>

      {/* Online Preview Table */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md">
        <div className="p-4 border-b border-slate-800 bg-[#0B1728] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-maple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Report Data Preview ({reportData.length} rows)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Export ready with XLSX / CSV compatibility
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B1728]/80 border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">Completed Yesterday</th>
                <th className="px-4 py-3">Working on Today</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Blocker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12">
                    <EmptyState
                      title="No report records"
                      description="Adjust your filters to see data in this report."
                    />
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {row.update_date}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-white block">{row.profile?.full_name}</span>
                      <span className="text-[10px] text-slate-500">{row.profile?.email}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-300">
                      {row.pod?.name}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs text-slate-300 line-clamp-2">
                      {row.yesterday}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs text-slate-200 line-clamp-2 font-medium">
                      {row.today}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-maple-400">
                      {row.progress_percent}%
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      {row.has_blocker ? (
                        <span className="text-rose-400 font-medium line-clamp-1">
                          [{row.blocker_category}] {row.blocker}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
