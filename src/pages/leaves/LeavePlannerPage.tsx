// ==============================================================================
// MapleBot: Clean & Lightweight Leave & Holiday Planner
// Minimalist, high-utility, and calming design with persistent storage
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataStore } from '../../services/dataStore';
import {
  LeaveRequest,
  CompanyHoliday,
  LeaveType,
  Quarter,
  HalfYear,
  LeaveStatus,
} from '../../types/leave';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Search,
  Download,
  Users,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const LeavePlannerPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { profile, currentRole, userPod } = useAuth();
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'manager';

  // Navigation Month State (Defaults to September 2026 for active demo)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 = September (0-indexed)

  // Active Tab: 'calendar' | 'team_leaves' | 'holidays'
  const [activeTab, setActiveTab] = useState<'calendar' | 'team_leaves' | 'holidays'>('calendar');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Simple Leave Application Modal State
  const todayStr = new Date().toISOString().split('T')[0];
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [leaveType, setLeaveType] = useState<LeaveType>('Paid Time Off (PTO)');
  const [reason, setReason] = useState('');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const allHolidays = dataStore.getCompanyHolidays(2026);
  const allLeaves = dataStore.getLeaveRequests({});

  // Active User Leave Balance
  const myBalance = useMemo(() => {
    return dataStore.getEmployeeLeaveBalance(profile?.id || '', 2026);
  }, [profile?.id, allLeaves.length]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Calculate working days excluding weekends
  const calculateDaysCount = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const calculatedDays = useMemo(() => {
    return calculateDaysCount(startDate, endDate);
  }, [startDate, endDate]);

  // Current Month Name
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  // Build Days Grid for Current Month
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const blanks = Array.from({ length: firstDayOfWeek });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return { blanks, days };
  }, [currentYear, currentMonth]);

  // Handle Leave Application
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast('error', 'Please select both start and end dates.');
      return;
    }

    try {
      const newLeave = dataStore.applyLeave({
        employee_id: profile?.id || 'prof-sample-member',
        employee_name: profile?.full_name || 'Harshika Netha',
        start_date: startDate,
        end_date: endDate,
        days_count: calculatedDays,
        leave_type: leaveType,
        reason: reason.trim() || 'Planned leave',
        status: isManager || isAdmin ? 'approved' : 'planned',
      });

      setIsApplyModalOpen(false);
      setReason('');
      showToast('success', `Planned leave for ${newLeave.days_count} day(s) recorded successfully!`);

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#00DC82', '#38bdf8', '#fbbf24'],
        });
      } catch {}
    } catch (err: any) {
      showToast('error', err.message || 'Failed to submit leave.');
    }
  };

  // Status Change for Leads / Managers
  const handleStatusChange = (id: string, newStatus: LeaveStatus) => {
    dataStore.updateLeaveStatus(id, newStatus, profile?.full_name || 'Pod Lead');
    showToast('success', `Leave request marked as ${newStatus}.`);
  };

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return allLeaves.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.employee_name.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.leave_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allLeaves, searchQuery]);

  // Calendar Day Click Handler
  const handleDayClick = (dateStr: string) => {
    setStartDate(dateStr);
    setEndDate(dateStr);
    setIsApplyModalOpen(true);
  };

  // Export to Excel
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const leaveRows = filteredLeaves.map((l) => ({
      Teammate: l.employee_name,
      'Leave Type': l.leave_type,
      'Start Date': l.start_date,
      'End Date': l.end_date,
      'Working Days': l.days_count,
      Status: l.status.toUpperCase(),
      Notes: l.reason,
      'Approved By': l.approved_by || 'Pending',
    }));
    const wsLeaves = XLSX.utils.json_to_sheet(leaveRows);
    XLSX.utils.book_append_sheet(wb, wsLeaves, 'Team Leaves');

    const holRows = allHolidays.map((h) => ({
      Holiday: h.name,
      Date: h.date,
      Day: h.day_of_week,
      Type: h.type.toUpperCase(),
      Description: h.description || '',
    }));
    const wsHols = XLSX.utils.json_to_sheet(holRows);
    XLSX.utils.book_append_sheet(wb, wsHols, 'Company Holidays 2026');

    XLSX.writeFile(wb, `MapleBot_Leave_Planner_2026.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. CLEAN SLEEK HEADER & ACTIONS */}
      <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-maple-400" />
              <h1 className="text-xl font-semibold text-white tracking-normal">
                Leave & Holiday Planner
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              View team availability, plan upcoming time off, and check declared company holidays.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-maple-500 text-slate-950 hover:bg-maple-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Request Leave</span>
            </button>

            <button
              onClick={handleExportXLSX}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Notifications Toast */}
        {toastMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Compact Horizontal Balance Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Total Quota:</span>
            <span className="font-semibold text-white">{myBalance.total_quota} days</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Approved Taken:</span>
            <span className="font-semibold text-emerald-400">{myBalance.taken_count} days</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Planned:</span>
            <span className="font-semibold text-sky-400">{myBalance.planned_count} days</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Available Balance:</span>
            <span className="font-bold text-maple-400">{myBalance.remaining_count} days</span>
          </div>
        </div>

        {/* Simple Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 pt-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-maple-400 text-maple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Team Calendar
          </button>
          <button
            onClick={() => setActiveTab('team_leaves')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'team_leaves'
                ? 'border-maple-400 text-maple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Team Leaves ({filteredLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'holidays'
                ? 'border-maple-400 text-maple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🌟 Company Holidays ({allHolidays.length})
          </button>
        </div>
      </div>

      {/* 2. TAB 1: CLEAN TEAM MONTH CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4 shadow-xl">
          {/* Month Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-base font-semibold text-white">
                {monthName}
              </h2>

              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Month Jumps */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { m: 6, label: 'Jul' },
                { m: 7, label: 'Aug' },
                { m: 8, label: 'Sep' },
                { m: 9, label: 'Oct' },
                { m: 10, label: 'Nov' },
                { m: 11, label: 'Dec' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setCurrentMonth(item.m)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    currentMonth === item.m
                      ? 'bg-maple-500/20 text-maple-300 border border-maple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Day of Week Header */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-400 py-1.5 bg-slate-900/40 rounded-lg">
            <span className="text-rose-400/80">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-rose-400/80">Sat</span>
          </div>

          {/* 7-Column Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Leading Blank Days */}
            {calendarDays.blanks.map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[72px] rounded-lg bg-slate-950/20" />
            ))}

            {/* Days of Month */}
            {calendarDays.days.map((dayNum) => {
              const mm = String(currentMonth + 1).padStart(2, '0');
              const dd = String(dayNum).padStart(2, '0');
              const dateStr = `${currentYear}-${mm}-${dd}`;
              const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              // Check if company declared holiday
              const holiday = allHolidays.find((h) => h.date === dateStr);

              // Check team leaves on this day
              const dayLeaves = allLeaves.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date);

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  title={holiday ? `${holiday.name} (${holiday.type})` : `Click to request leave on ${dateStr}`}
                  className={`min-h-[72px] p-1.5 rounded-lg border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                    holiday
                      ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400'
                      : dayLeaves.length > 0
                      ? 'bg-sky-950/30 border-sky-500/30 hover:border-sky-400'
                      : isWeekend
                      ? 'bg-slate-950/30 border-slate-900/60'
                      : 'bg-slate-900/40 border-slate-800/60 hover:border-maple-500/40 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold font-mono ${
                        holiday
                          ? 'text-amber-300'
                          : isWeekend
                          ? 'text-slate-500'
                          : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {holiday && (
                      <span className="text-[10px]" title="Company Holiday">🌟</span>
                    )}
                  </div>

                  {/* Day Events */}
                  <div className="space-y-0.5 mt-0.5">
                    {holiday && (
                      <div className="text-[9px] font-semibold text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded truncate">
                        {holiday.name}
                      </div>
                    )}

                    {dayLeaves.map((dl) => (
                      <div
                        key={dl.id}
                        className={`text-[9px] font-medium px-1 py-0.5 rounded truncate ${
                          dl.employee_name.includes('Harshika')
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {dl.employee_name.split(' ')[0]} • {dl.leave_type.split(' ')[0]}
                      </div>
                    ))}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-slate-500 text-right">
                    + add
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB 2: TEAM LEAVES TABLE */}
      {activeTab === 'team_leaves' && (
        <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                Team Leaves Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Review who is on leave and manage pending requests.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teammate..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
              />
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Teammate</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Leave Type</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Dates</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Days</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Notes</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                  {(isManager || isAdmin) && (
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-white whitespace-nowrap">
                      {l.employee_name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
                      {l.leave_type}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-200 whitespace-nowrap">
                      {l.start_date} → {l.end_date}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-sky-400 font-semibold whitespace-nowrap">
                      {l.days_count}d
                    </td>
                    <td className="py-3 px-3.5 text-slate-300">
                      {l.reason}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        l.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    {(isManager || isAdmin) && (
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {l.status === 'planned' || l.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStatusChange(l.id, 'approved')}
                              className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 font-semibold text-[10px] transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(l.id, 'rejected')}
                              className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white font-semibold text-[10px] transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            By {l.approved_by || 'Manager'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB 3: COMPANY DECLARED HOLIDAYS */}
      {activeTab === 'holidays' && (
        <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4 shadow-xl">
          <div>
            <h2 className="text-base font-semibold text-white">
              Company Declared Holidays (2026)
            </h2>
            <p className="text-xs text-slate-400">
              Official company holidays observed by all pods and locations.
            </p>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Day</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Holiday Name</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3.5 min-w-[240px]">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {allHolidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-semibold text-amber-400 whitespace-nowrap">
                      {h.date}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
                      {h.day_of_week}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-white">
                      {h.name}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        h.type === 'mandatory'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-400">
                      {h.description || 'Official company holiday'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SIMPLE LEAVE APPLICATION MODAL */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Request Time Off"
        maxWidth="lg"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 p-1">
          {/* Leave Type */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Leave Type *
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer font-medium"
              required
            >
              <option value="Paid Time Off (PTO)">Paid Time Off (PTO)</option>
              <option value="Casual Leave (CL)">Casual Leave (CL)</option>
              <option value="Sick Leave (SL)">Sick Leave (SL)</option>
              <option value="Optional / Floater Holiday">Optional / Floater Holiday</option>
              <option value="Compensatory Off">Compensatory Off</option>
              <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                From Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                To Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-maple-500 font-medium"
                required
              />
            </div>
          </div>

          {/* Calculated Duration */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Working Days:</span>
            <span className="font-mono font-semibold text-sky-400">
              {calculatedDays} day(s) (Excludes weekends)
            </span>
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Vacation, family travel..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-maple-500 text-slate-950 hover:bg-maple-400 font-semibold"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
