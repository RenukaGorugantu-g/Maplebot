// ==============================================================================
// MapleBot: Generate Executive Performance Report Modal
// Inputs: Employee, Period, Report Type, and AI Synthesis Trigger
// ==============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button, GradientButton } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { ReportType } from '../../../types/performance';
import { Sparkles } from 'lucide-react';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    employeeId: string;
    periodStart: string;
    periodEnd: string;
    periodLabel: string;
    reportType: ReportType;
  }) => void;
}

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  const [employeeId, setEmployeeId] = useState<string>(availableProfiles[0]?.id || 'prof-harshika');
  const [periodPreset, setPeriodPreset] = useState<'aug2026' | 'jul2026' | 'q32026' | 'custom'>('aug2026');
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [periodLabel, setPeriodLabel] = useState<string>('August 2026');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handlePresetChange = (preset: 'aug2026' | 'jul2026' | 'q32026' | 'custom') => {
    setPeriodPreset(preset);
    if (preset === 'aug2026') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
      setPeriodLabel('August 2026');
      setReportType('monthly');
    } else if (preset === 'jul2026') {
      setStartDate('2026-07-01');
      setEndDate('2026-07-31');
      setPeriodLabel('July 2026');
      setReportType('monthly');
    } else if (preset === 'q32026') {
      setStartDate('2026-07-01');
      setEndDate('2026-09-30');
      setPeriodLabel('Q3 2026');
      setReportType('quarterly');
    }
  };

  const handleTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      onGenerate({
        employeeId,
        periodStart: startDate,
        periodEnd: endDate,
        periodLabel: periodLabel || `${startDate} to ${endDate}`,
        reportType,
      });
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Executive Performance Report" maxWidth="lg">
      <form onSubmit={handleTrigger} className="space-y-4 text-xs">
        {/* Employee */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1">
            Select Employee *
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={!isAdmin && !isManager}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer disabled:opacity-70 text-xs"
          >
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role} • {p.pod?.name || 'Pod'})
              </option>
            ))}
          </select>
        </div>

        {/* Period Presets */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1">
            Reporting Period Preset
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'aug2026', label: 'August 2026' },
              { id: 'jul2026', label: 'July 2026' },
              { id: 'q32026', label: 'Q3 2026' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as any)}
                className={`py-1.5 px-2 rounded-lg text-center font-medium border text-[11px] transition-all ${
                  periodPreset === p.id
                    ? 'bg-maple-500/20 text-maple-300 border-maple-500/40 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 block mb-1">Period Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 text-xs cursor-pointer"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Period End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 text-xs cursor-pointer"
            />
          </div>
        </div>

        {/* Report Type */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1">Report Review Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-maple-500 cursor-pointer text-xs"
          >
            <option value="individual">Individual General Review</option>
            <option value="monthly">Monthly Performance Review</option>
            <option value="quarterly">Quarterly Executive Review</option>
            <option value="kra_kpi">KRA / KPI Goal Alignment</option>
            <option value="project">Project Deliverables Audit</option>
          </select>
        </div>

        {/* AI Evidence Notice */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-[11px] text-slate-400">
          <span className="font-bold text-maple-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Deterministic & Evidence-Based Engine
          </span>
          <p>
            Generates 100% data-traceable KPI scorecards, activity-to-impact matrices, evidence strengths, and areas for development from verified work logs.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <GradientButton
            size="sm"
            type="submit"
            disabled={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {isGenerating ? 'Synthesizing...' : 'Generate Executive Report'}
          </GradientButton>
        </div>
      </form>
    </Modal>
  );
};
