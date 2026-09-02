// ==============================================================================
// MapleBot: KRA / KPI Target Management Tab
// Departmental & employee goal setting, target vs actual comparisons
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { PerformanceKPI } from '../../../types/performance';
import { ManageKpiModal } from './ManageKpiModal';
import { GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  PlusCircle,
  Edit2,
  Trash2,
} from 'lucide-react';

export const KraKpiTab: React.FC = () => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const pods = dataStore.getPods();
  const [selectedPodId, setSelectedPodId] = useState<string>(isManager ? (profile?.pod_id || '') : '');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingKpi, setEditingKpi] = useState<PerformanceKPI | undefined>(undefined);

  const kpis = dataStore.getPerformanceKPIs({
    podId: selectedPodId || undefined,
  });

  const handleEdit = (kpi: PerformanceKPI) => {
    setEditingKpi(kpi);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this KPI target?')) {
      dataStore.deletePerformanceKPI(id);
    }
  };

  const handleCreateNew = () => {
    setEditingKpi(undefined);
    setIsModalOpen(true);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Exceeded</span>;
      case 'met':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-maple-500/15 text-maple-300 border border-maple-500/30">Met</span>;
      case 'near_target':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">Near Target</span>;
      case 'needs_attention':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">Below Target</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Not Measured</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. HEADER */}
      <div className="glass-card p-6 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400">
              Goal Architecture & Metric Tracking
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Key Result Areas (KRAs) & KPIs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure measurable targets, evaluation frequencies, and target-vs-actual progress indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <select
              value={selectedPodId}
              onChange={(e) => setSelectedPodId(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Departments ({pods.length})</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {(isAdmin || isManager) && (
            <GradientButton
              size="sm"
              onClick={handleCreateNew}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Define New KPI
            </GradientButton>
          )}
        </div>
      </div>

      {/* 2. KPI TARGET VS ACTUAL TABLE */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
        {kpis.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No KPIs Configured"
              description="No KRA / KPI targets exist for the selected department. Click 'Define New KPI' to create one."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Key Result Area (KRA)</th>
                  <th className="py-3 px-4">Key Performance Indicator (KPI)</th>
                  <th className="py-3 px-4 text-right">Target</th>
                  <th className="py-3 px-4 text-right">Actual</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Measurement Formula</th>
                  <th className="py-3 px-4">Frequency</th>
                  {(isAdmin || isManager) && (
                    <th className="py-3 px-4 text-center">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {kpis.map((kpi) => (
                  <tr key={kpi.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {kpi.kra}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {kpi.kpi}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300 font-semibold">
                      {kpi.target_value !== undefined ? `${kpi.target_value}${kpi.target_unit || ''}` : <span className="text-slate-500 italic">Not Defined</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-maple-400">
                      {kpi.actual_value !== undefined ? `${kpi.actual_value}${kpi.target_unit || ''}` : <span className="text-slate-500 italic">N/A</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(kpi.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {kpi.measurement}
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize text-[11px]">
                      {kpi.frequency}
                    </td>
                    {(isAdmin || isManager) && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(kpi)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit KPI"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(kpi.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete KPI"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <ManageKpiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {}}
        initialKpi={editingKpi}
      />
    </div>
  );
};
