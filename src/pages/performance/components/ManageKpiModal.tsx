// ==============================================================================
// MapleBot: Manage KRA / KPI Target Modal
// Creates or edits departmental and employee performance indicators
// ==============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button, GradientButton } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { PerformanceKPI, KpiFrequency, KpiStatus } from '../../../types/performance';
import { Target, AlertTriangle } from 'lucide-react';

interface ManageKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialKpi?: PerformanceKPI;
}

export const ManageKpiModal: React.FC<ManageKpiModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialKpi,
}) => {
  const { profile, currentRole } = useAuth();
  const pods = dataStore.getPods();
  const profiles = dataStore.getProfiles().filter((p) => p.status === 'active');

  const [kra, setKra] = useState<string>(initialKpi?.kra || 'Development Delivery');
  const [kpi, setKpi] = useState<string>(initialKpi?.kpi || '');
  const [targetValue, setTargetValue] = useState<number | undefined>(initialKpi?.target_value || 90);
  const [targetUnit, setTargetUnit] = useState<string>(initialKpi?.target_unit || '%');
  const [actualValue, setActualValue] = useState<number | undefined>(initialKpi?.actual_value || 88);
  const [status, setStatus] = useState<KpiStatus>(initialKpi?.status || 'near_target');
  const [measurement, setMeasurement] = useState<string>(initialKpi?.measurement || 'Completed Tasks / Committed Tasks');
  const [frequency, setFrequency] = useState<KpiFrequency>(initialKpi?.frequency || 'monthly');
  const [podId, setPodId] = useState<string>(initialKpi?.pod_id || 'pod-web-sales');
  const [employeeId, setEmployeeId] = useState<string>(initialKpi?.employee_id || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kra.trim() || !kpi.trim() || !measurement.trim()) {
      setErrorMsg('Please specify KRA, KPI name, and measurement method.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (initialKpi?.id) {
        dataStore.updatePerformanceKPI(initialKpi.id, {
          kra: kra.trim(),
          kpi: kpi.trim(),
          target_value: targetValue !== undefined ? Number(targetValue) : undefined,
          target_unit: targetUnit.trim(),
          actual_value: actualValue !== undefined ? Number(actualValue) : undefined,
          status,
          measurement: measurement.trim(),
          frequency,
          pod_id: podId || undefined,
          employee_id: employeeId || undefined,
        });
      } else {
        dataStore.createPerformanceKPI({
          organization_id: profile?.organization_id || 'org-maple-01',
          kra: kra.trim(),
          kpi: kpi.trim(),
          target_value: targetValue !== undefined ? Number(targetValue) : undefined,
          target_unit: targetUnit.trim(),
          actual_value: actualValue !== undefined ? Number(actualValue) : undefined,
          status,
          measurement: measurement.trim(),
          frequency,
          pod_id: podId || undefined,
          employee_id: employeeId || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save KPI target.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialKpi ? 'Edit KRA / KPI Target' : 'Define New KRA / KPI Target'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* KRA */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Key Result Area (KRA) *
            </label>
            <input
              type="text"
              value={kra}
              onChange={(e) => setKra(e.target.value)}
              placeholder="e.g. Development, SEO, LMS Delivery"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
              required
            />
          </div>

          {/* KPI */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Key Performance Indicator (KPI) *
            </label>
            <input
              type="text"
              value={kpi}
              onChange={(e) => setKpi(e.target.value)}
              placeholder="e.g. Sprint Task Completion Rate"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
              required
            />
          </div>
        </div>

        {/* Target & Actual values */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Target Value</label>
            <input
              type="number"
              step="any"
              value={targetValue ?? ''}
              onChange={(e) => setTargetValue(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="90"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-maple-500 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Target Unit</label>
            <input
              type="text"
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              placeholder="%, deliverables, hours"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Actual Value</label>
            <input
              type="number"
              step="any"
              value={actualValue ?? ''}
              onChange={(e) => setActualValue(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="88.5"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-maple-500 text-xs"
            />
          </div>
        </div>

        {/* Status & Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Target Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as KpiStatus)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs"
            >
              <option value="exceeded">Exceeded</option>
              <option value="met">Met</option>
              <option value="near_target">Near Target</option>
              <option value="needs_attention">Needs Attention / Below Target</option>
              <option value="not_measured">Not Measured</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Measurement Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as KpiFrequency)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>

        {/* Measurement Method */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1">
            Measurement Formula / Source *
          </label>
          <input
            type="text"
            value={measurement}
            onChange={(e) => setMeasurement(e.target.value)}
            placeholder="e.g. Completed Tasks / Committed Tasks"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 text-xs"
            required
          />
        </div>

        {/* Scope: Pod / Employee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Pod / Department Scope</label>
            <select
              value={podId}
              onChange={(e) => setPodId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs"
            >
              <option value="">All Pods (Organization-Wide)</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Employee (Optional)</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs"
            >
              <option value="">Department-Wide KPI</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <GradientButton size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialKpi ? 'Update KPI' : 'Create KPI'}
          </GradientButton>
        </div>
      </form>
    </Modal>
  );
};
