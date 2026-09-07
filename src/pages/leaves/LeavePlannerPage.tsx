// ==============================================================================
// MapleBot: Executive & Clean Leave Tracker
// Dynamic 12-day Individual Entitlement, Pod Lead Approvals, Team Leaves & GChat Sync
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
import { googleChatService } from '../../services/googleChatService';
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
  ShieldCheck,
} from 'lucide-react';

export const LeavePlannerPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { profile, currentRole, isPodLead, isAdmin, isManager, userPod } = useAuth();

  // Navigation Month State (Defaults to September 2026 for active demo)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 = September (0-indexed)

  // Active Tab: 'calendar' | 'pending_approvals' | 'team_leaves' | 'holidays'
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending_approvals' | 'team_leaves' | 'holidays'>('calendar');

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

  // Active User Leave Balance (Dynamic from DB leave_balances, default 12)
  const myBalance = useMemo(() => {
    return dataStore.getEmployeeLeaveBalance(profile?.id || '', 2026);
  }, [profile?.id, allLeaves]);

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

  // Pending leaves for Pod Lead / Manager approval
  const podPendingLeaves = useMemo(() => {
    return allLeaves.filter((l) => {
      const isPending = l.status === 'pending' || l.status === 'planned';
      if (!isPending) return false;
      if (isAdmin) return true;
      if (isPodLead || isManager) {
        return l.pod_id === userPod?.id || l.pod_id === profile?.pod_id;
      }
      return false;
    });
  }, [allLeaves, isAdmin, isPodLead, isManager, userPod?.id, profile?.pod_id]);

  // Approved Team Leaves
  const approvedTeamLeaves = useMemo(() => {
    return allLeaves.filter((l) => l.status === 'approved');
  }, [allLeaves]);

  // Handle Leave Application
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast('error', 'Please select both from and to dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast('error', 'From date cannot be after To date.');
      return;
    }

    if (!reason.trim()) {
      showToast('error', 'Reason is mandatory. Please state the reason for your leave.');
      return;
    }

    if (calculatedDays > myBalance.available_balance && leaveType !== 'Unpaid Leave') {
      showToast('error', `Requested duration (${calculatedDays} days) exceeds your available balance (${myBalance.available_balance} days).`);
      return;
    }

    try {
      const newLeave = dataStore.applyLeave({
        employee_id: profile?.id || '',
        employee_name: profile?.full_name || 'Team Member',
        start_date: startDate,
        end_date: endDate,
        days_count: calculatedDays,
        leave_type: leaveType,
        reason: reason.trim(),
        status: 'pending', // Pending approval by Pod Lead
      });

      setIsApplyModalOpen(false);
      setReason('');
      showToast('success', `Leave request for ${newLeave.days_count} day(s) submitted & sent to Pod Lead for approval!`);

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

  // Status Change (Approve / Reject) by Pod Lead or Manager
  const handleStatusChange = (id: string, newStatus: LeaveStatus) => {
    const approver = profile?.full_name || (isPodLead ? 'Pod Lead' : 'Manager');
    const updated = dataStore.updateLeaveStatus(id, newStatus, approver);

    if (updated && newStatus === 'approved') {
      // Dispatch formatted Google Chat notification upon approval
      googleChatService.sendLeaveApprovedCard({
        employeeName: updated.employee_name,
        startDate: updated.start_date,
        endDate: updated.end_date,
        daysCount: updated.days_count,
        leaveType: updated.leave_type,
        approvedBy: approver,
        podName: updated.pod_name || userPod?.name,
        reason: updated.reason,
      });
      showToast('success', `Leave for ${updated.employee_name} APPROVED. Balance deducted & Google Chat notified!`);
    } else if (updated && newStatus === 'rejected') {
      showToast('success', `Leave request for ${updated.employee_name} rejected.`);
    }
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
    const leaveRows = allLeaves.map((l) => ({
      Teammate: l.employee_name,
      'Leave Type': l.leave_type,
      'Start Date': l.start_date,
      'End Date': l.end_date,
      'Working Days': l.days_count,
      Status: l.status.toUpperCase(),
      Reason: l.reason,
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

    XLSX.writeFile(wb, `MapleBot_Leave_Tracker_2026.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. CLEAN SLEEK HEADER & ACTIONS */}
      <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-xl font-semibold text-white tracking-normal">
                Leave Tracker
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual 12-day annual entitlement, Pod Lead approvals, team availability, and company holidays.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-maple-500 text-slate-950 hover:bg-maple-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Request Leave</span>
            </button>

            <button
              onClick={handleExportXLSX}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Notifications Toast */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-lg ${
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

        {/* 4 SUMMARY STAT CARDS (My Leave Balance) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Total Annual Quota */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Leave</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-white">{myBalance.total_quota}</span>
              <span className="text-xs text-slate-400 font-medium">days</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Annual 2026 entitlement</span>
          </div>

          {/* 2. Approved Taken */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Approved Taken</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-400">{myBalance.taken_count}</span>
              <span className="text-xs text-slate-400 font-medium">days</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Approved & utilized</span>
          </div>

          {/* 3. Pending Requests */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Pending</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-sky-400">{myBalance.pending_count}</span>
              <span className="text-xs text-slate-400 font-medium">days</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Awaiting Pod Lead review</span>
          </div>

          {/* 4. Available Balance */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-maple-500/30 shadow-sm flex flex-col justify-between bg-gradient-to-br from-maple-950/20 to-transparent">
            <span className="text-[11px] font-semibold text-maple-400 uppercase tracking-wider">Available Balance</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-maple-300">{myBalance.available_balance}</span>
              <span className="text-xs text-slate-400 font-medium">days</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Remaining to request</span>
          </div>
        </div>

        {/* Clean Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 pt-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'border-maple-400 text-maple-300 bg-maple-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Team Calendar
          </button>

          {(isPodLead || isManager || isAdmin) && (
            <button
              onClick={() => setActiveTab('pending_approvals')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'pending_approvals'
                  ? 'border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Pending Pod Approvals</span>
              {podPendingLeaves.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-slate-950 font-extrabold">
                  {podPendingLeaves.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('team_leaves')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'team_leaves'
                ? 'border-maple-400 text-maple-300 bg-maple-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Approved Team Leaves ({approvedTeamLeaves.length})
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'holidays'
                ? 'border-maple-400 text-maple-300 bg-maple-500/10 rounded-t-lg'
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-base font-bold text-white">
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
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
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

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/50 rounded-lg">
                {d}
              </div>
            ))}

            {calendarDays.blanks.map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[85px] bg-slate-950/30 rounded-xl border border-dashed border-slate-800/40" />
            ))}

            {calendarDays.days.map((day) => {
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const holiday = allHolidays.find((h) => h.date === dateStr);
              const dayLeaves = allLeaves.filter((l) => l.start_date <= dateStr && l.end_date >= dateStr && l.status === 'approved');
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(dateStr)}
                  className={`min-h-[85px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer select-none ${
                    isToday
                      ? 'bg-maple-500/10 border-maple-500/40'
                      : holiday
                      ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-500/60'
                      : dayLeaves.length > 0
                      ? 'bg-sky-950/20 border-sky-800/40 hover:border-sky-500/60'
                      : 'bg-[#0B1728]/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${isToday ? 'text-maple-400' : 'text-slate-300'}`}>
                      {day}
                    </span>
                    {holiday && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        Holiday
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 my-1">
                    {holiday && (
                      <p className="text-[10px] text-amber-300 font-medium truncate" title={holiday.name}>
                        ⭐ {holiday.name}
                      </p>
                    )}
                    {dayLeaves.slice(0, 2).map((dl) => (
                      <span
                        key={dl.id}
                        className="text-[10px] px-1.5 py-0.5 rounded block truncate font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        title={`${dl.employee_name} (${dl.leave_type})`}
                      >
                        🌴 {dl.employee_name}
                      </span>
                    ))}
                    {dayLeaves.length > 2 && (
                      <span className="text-[9px] text-slate-400 block">+{dayLeaves.length - 2} more</span>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-500 self-end opacity-0 hover:opacity-100">+ apply</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB 2: PENDING POD APPROVALS (FOR POD LEADS & MANAGERS) */}
      {activeTab === 'pending_approvals' && (isPodLead || isManager || isAdmin) && (
        <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">
                  Pending Pod Leave Requests
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review, verify available balance, and approve or reject leave requests for your pod members.
              </p>
            </div>
          </div>

          {podPendingLeaves.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-400">There are no pending leave requests in your pod right now.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Teammate</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Leave Type</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Dates</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Days</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Reason (Required)</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Available Balance</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {podPendingLeaves.map((l) => {
                    const empBal = dataStore.getEmployeeLeaveBalance(l.employee_id, l.year);
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                          {l.employee_name}
                        </td>
                        <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
                          {l.leave_type}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-200 whitespace-nowrap">
                          {l.start_date} → {l.end_date}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-sky-400 font-bold whitespace-nowrap">
                          {l.days_count}d
                        </td>
                        <td className="py-3 px-3.5 text-slate-200 font-medium">
                          {l.reason}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-maple-400 bg-maple-500/10 px-2 py-0.5 rounded border border-maple-500/20">
                            {empBal.available_balance} days
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStatusChange(l.id, 'approved')}
                              className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs shadow transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(l.id, 'rejected')}
                              className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 3: APPROVED TEAM LEAVES */}
      {activeTab === 'team_leaves' && (
        <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Approved Team Leaves
              </h2>
              <p className="text-xs text-slate-400">
                Shows all approved team members and upcoming time off.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teammate..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 font-medium"
              />
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1728] border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Employee</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">From</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">To</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Days</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Leave Type</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Reason</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredLeaves
                  .filter((l) => l.status === 'approved')
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                        {l.employee_name}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {l.start_date}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {l.end_date}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono text-sky-400 font-bold whitespace-nowrap">
                        {l.days_count}d
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
                        {l.leave_type}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {l.reason}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Approved
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap">
                        {l.approved_by || 'Pod Lead'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 4: COMPANY DECLARED HOLIDAYS */}
      {activeTab === 'holidays' && (
        <div className="glass-card p-5 border border-slate-800 bg-[#081426]/90 space-y-4 shadow-xl">
          <div>
            <h2 className="text-base font-bold text-white">
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
                    <td className="py-3 px-3.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {h.date}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
                      {h.day_of_week}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-white">
                      {h.name}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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

      {/* 6. LEAVE APPLICATION MODAL (MANDATORY REASON VALIDATION) */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Request Leave (12-Day Annual Entitlement)"
        maxWidth="lg"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 p-1">
          {/* Available Balance Preview */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Your Current Available Balance:</span>
            <span className="font-mono font-bold text-maple-400 bg-maple-500/10 px-2.5 py-0.5 rounded border border-maple-500/20">
              {myBalance.available_balance} days
            </span>
          </div>

          {/* Leave Type */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Leave Type *
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 cursor-pointer font-medium"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 font-medium"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-maple-500 font-medium"
                required
              />
            </div>
          </div>

          {/* Calculated Duration */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Working Days:</span>
            <span className="font-mono font-bold text-sky-400">
              {calculatedDays} day(s) (Excludes weekends)
            </span>
          </div>

          {/* Reason (MANDATORY) */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">
              Reason for Leave * <span className="text-rose-400">(Required)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Personal work, family travel, health appointment..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-maple-500 font-medium"
              required
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
              className="bg-maple-500 text-slate-950 hover:bg-maple-400 font-bold shadow-md"
            >
              Submit Leave Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
