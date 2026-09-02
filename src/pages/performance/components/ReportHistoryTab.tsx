// ==============================================================================
// MapleBot: Executive Report History & Archive Tab
// Auditing, exporting & revisiting generated corporate performance evaluations
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceExportService } from '../../../services/performanceExportService';
import { PerformanceReport } from '../../../types/performance';
import { ExecutiveReportView } from './ExecutiveReportView';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  Download,
  Eye,
  Trash2,
} from 'lucide-react';

interface ReportHistoryTabProps {
  onSelectReportToEdit: (employeeId: string) => void;
}

export const ReportHistoryTab: React.FC<ReportHistoryTabProps> = ({
  onSelectReportToEdit,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedReportForModal, setSelectedReportForModal] = useState<PerformanceReport | null>(null);

  const reports = dataStore.getPerformanceReports({
    employeeId: selectedEmployeeId || undefined,
    podId: isManager ? profile?.pod_id : undefined,
    status: selectedStatus || undefined,
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this archived report?')) {
      dataStore.deletePerformanceReport(id);
    }
  };

  const handleExportXLSX = (report: PerformanceReport) => {
    performanceExportService.exportIndividualReportToXLSX(report.report_data);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. HEADER & FILTERS */}
      <div className="glass-card p-6 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400">
              Corporate Audit Archive
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Generated Report History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Access past executive evaluations, appraisal scorecards, and exported management reviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
          >
            <option value="">All Employees ({availableProfiles.length})</option>
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* 2. HISTORY TABLE */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
        {reports.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Archived Reports"
              description="No generated reports match your criteria. You can create a new performance report under the Individual Reports tab."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Report Type</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Generated On</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Review Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {rep.employee_name}
                      {rep.pod_name && (
                        <span className="text-[10px] text-slate-400 block font-normal">{rep.pod_name}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-300 font-medium">
                      {rep.report_type.replace('_', ' ')} Review
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {rep.period_label}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(rep.generated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      {rep.performance_score !== null ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-maple-500/20 text-maple-300 border border-maple-500/30">
                          {rep.performance_score} / 100
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">Not Evaluated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          rep.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : rep.status === 'reviewed'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReportForModal(rep)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-maple-400" />}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportXLSX(rep)}
                          title="Download Excel"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-300" />
                        </Button>
                        {(isAdmin || isManager) && (
                          <button
                            onClick={() => handleDelete(rep.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Report View Modal */}
      {selectedReportForModal && (
        <Modal
          isOpen={!!selectedReportForModal}
          onClose={() => setSelectedReportForModal(null)}
          title={`Executive Performance Report — ${selectedReportForModal.employee_name}`}
          maxWidth="2xl"
        >
          <div className="p-2">
            <ExecutiveReportView
              reportData={selectedReportForModal.report_data}
              savedReport={selectedReportForModal}
              onSaveManagerReview={(updates) => {
                const updated = dataStore.updatePerformanceReport(selectedReportForModal.id, updates);
                if (updated) setSelectedReportForModal(updated);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
