// ==============================================================================
// MapleBot: Structured Work Data Tab
// Professional tabular interface with comprehensive filtering, sorting & exports
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dataStore } from '../../../services/dataStore';
import { performanceService } from '../../../services/performanceService';
import { performanceExportService } from '../../../services/performanceExportService';
import { PerformanceWorkLog } from '../../../types/performance';
import { CreateWorkLogModal } from './CreateWorkLogModal';
import { Button, GradientButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  Search,
  PlusCircle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const StructuredWorkDataTab: React.FC = () => {
  const { profile, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  const pods = dataStore.getPods();
  const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active');
  const availableProfiles = isManager
    ? allProfiles.filter((p) => p.pod_id === profile?.pod_id || (p.pod_ids && p.pod_ids.includes(profile?.pod_id || '')))
    : allProfiles;

  // Filter states
  const [selectedPodId, setSelectedPodId] = useState<string>(isManager ? (profile?.pod_id || '') : '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal & Pagination states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importNotice, setImportNotice] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortKey, setSortKey] = useState<keyof PerformanceWorkLog>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter profiles based on selected pod
  const filteredProfiles = useMemo(() => {
    if (!selectedPodId) return availableProfiles;
    return availableProfiles.filter((p) => p.pod_id === selectedPodId || (p.pod_ids && p.pod_ids.includes(selectedPodId)));
  }, [availableProfiles, selectedPodId]);

  // Retrieve raw combined logs
  const allLogs = useMemo(() => {
    return performanceService.getAllWorkLogsForPeriod(
      selectedEmployeeId || undefined,
      selectedPodId || undefined,
      startDate || undefined,
      endDate || undefined
    );
  }, [selectedEmployeeId, selectedPodId, startDate, endDate]);

  // Extract distinct projects
  const distinctProjects = useMemo(() => {
    const set = new Set<string>();
    allLogs.forEach((l) => {
      if (l.project) set.add(l.project);
    });
    return Array.from(set).sort();
  }, [allLogs]);

  // Apply search and table filters
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      if (selectedProject && l.project !== selectedProject) return false;
      if (selectedCategory && l.category !== selectedCategory) return false;
      if (selectedStatus && l.status !== selectedStatus) return false;
      if (selectedPriority && l.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          l.task_title.toLowerCase().includes(q) ||
          l.employee_name.toLowerCase().includes(q) ||
          l.project.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.deliverable && l.deliverable.toLowerCase().includes(q)) ||
          (l.outcome && l.outcome.toLowerCase().includes(q)) ||
          (l.impact && l.impact.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allLogs, selectedProject, selectedCategory, selectedStatus, selectedPriority, searchQuery]);

  // Sort logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      return sortOrder === 'asc' ? 1 : -1;
    });
  }, [filteredLogs, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLogs.slice(start, start + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  const handleSort = (key: keyof PerformanceWorkLog) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleImportFromStandups = () => {
    setIsImporting(true);
    try {
      const rawUpdates = dataStore.getUpdates();
      let importedCount = 0;
      const existingLogs = dataStore.getPerformanceWorkLogs();
      const existingSourceIds = new Set(existingLogs.map((l) => l.source_update_id).filter(Boolean));

      rawUpdates.forEach((u) => {
        if (!existingSourceIds.has(u.id)) {
          const transformed = performanceService.transformUpdateToWorkLogs(u);
          transformed.forEach((t) => {
            dataStore.createPerformanceWorkLog(t);
            importedCount++;
          });
        }
      });

      setImportNotice(`Successfully mapped & structured ${importedCount} task entries from raw standup check-ins!`);
      setTimeout(() => setImportNotice(''), 4000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportXLSX = () => {
    performanceExportService.exportStructuredWorkLogsToXLSX(filteredLogs);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="glass-card p-6 border border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-maple-400">
              Granular Activity & Deliverable Ledger
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Structured Employee Work Data
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Search, sort, filter, and audit verified work items with measurable deliverables, outcomes, and business impact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleImportFromStandups}
            disabled={isImporting}
            leftIcon={<RefreshCw className={`w-4 h-4 text-maple-400 ${isImporting ? 'animate-spin' : ''}`} />}
          >
            {isImporting ? 'Mapping...' : 'Sync Raw Standups'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportXLSX}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Excel (.xlsx)
          </Button>

          <GradientButton
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Log Work Record
          </GradientButton>
        </div>
      </div>

      {importNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4" />
          {importNotice}
        </div>
      )}

      {/* 2. ADVANCED FILTERS BAR */}
      <div className="glass-card p-5 border border-slate-800/90 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by task, employee, deliverable, outcome, impact..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-maple-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Showing <strong>{filteredLogs.length}</strong> matching records</span>
          </div>
        </div>

        {/* Multi-Field Filter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 border-t border-slate-800/60">
          {isAdmin && (
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Department</label>
              <select
                value={selectedPodId}
                onChange={(e) => {
                  setSelectedPodId(e.target.value);
                  setSelectedEmployeeId('');
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
              >
                <option value="">All Pods ({pods.length})</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Employees ({filteredProfiles.length})</option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Projects ({distinctProjects.length})</option>
              {distinctProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Development">Development</option>
              <option value="SEO">SEO</option>
              <option value="Sales">Sales</option>
              <option value="LMS">LMS</option>
              <option value="Marketing">Marketing</option>
              <option value="Coordination">Coordination</option>
              <option value="Design">Design</option>
              <option value="Quality Assurance">Quality Assurance</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-maple-500 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. STRUCTURED DATA TABLE */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#081426]/90 backdrop-blur-md shadow-dark-card">
        {sortedLogs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No work records found"
              description="No structured work records match the selected filters. You can log a new record or sync from daily standups."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      {sortKey === 'date' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-maple-400" /> : <ChevronDown className="w-3 h-3 text-maple-400" />)}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('employee_name')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Employee</span>
                      {sortKey === 'employee_name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-maple-400" /> : <ChevronDown className="w-3 h-3 text-maple-400" />)}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Department</th>
                  <th
                    onClick={() => handleSort('project')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Project</span>
                      {sortKey === 'project' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-maple-400" /> : <ChevronDown className="w-3 h-3 text-maple-400" />)}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 min-w-[220px]">Task / Activity</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Category</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  <th
                    onClick={() => handleSort('duration_hours')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:text-white select-none whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Hours</span>
                      {sortKey === 'duration_hours' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-maple-400" /> : <ChevronDown className="w-3 h-3 text-maple-400" />)}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Deliverable</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Outcome</th>
                  <th className="py-3 px-3.5 min-w-[220px]">Impact</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedLogs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap align-top">
                      {row.date}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-white whitespace-nowrap align-top">
                      {row.employee_name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap align-top">
                      {row.department}
                    </td>
                    <td className="py-3 px-3.5 text-slate-200 font-medium whitespace-nowrap align-top">
                      {row.project}
                    </td>
                    <td className="py-3 px-3.5 align-top">
                      <span className="font-medium text-white block">{row.task_title}</span>
                      {row.task_description && (
                        <span className="text-[11px] text-slate-400 block line-clamp-2 mt-0.5">
                          {row.task_description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap align-top">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap align-top">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : row.status === 'blocked'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-sky-400 font-bold whitespace-nowrap align-top">
                      {row.duration_hours}h
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap align-top">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.priority === 'critical'
                            ? 'bg-rose-500/20 text-rose-300'
                            : row.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 text-[11px] align-top leading-relaxed">
                      {row.deliverable || <span className="text-slate-500 italic">Not available</span>}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 text-[11px] align-top leading-relaxed">
                      {row.outcome || <span className="text-slate-500 italic">Not available</span>}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 text-[11px] align-top leading-relaxed">
                      <span className={row.impact?.includes('not measurable') ? 'text-slate-500 italic' : 'text-emerald-300'}>
                        {row.impact || 'Impact not measurable from available data.'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap align-top text-[11px]">
                      {row.reviewer_name || 'Not assigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0B1728]/50 text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedLogs.length)} of {sortedLogs.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-700 disabled:opacity-30 hover:bg-slate-800 text-slate-300 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-700 disabled:opacity-30 hover:bg-slate-800 text-slate-300 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateWorkLogModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};
