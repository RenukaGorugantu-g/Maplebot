// ==============================================================================
// MapleBot: Leave Planner & Company Declared Holidays Types
// Supports Quarterly, Half-Yearly, and Yearly Time Horizons
// ==============================================================================

export type LeaveType =
  | 'Paid Time Off (PTO)'
  | 'Casual Leave (CL)'
  | 'Sick Leave (SL)'
  | 'Optional / Floater Holiday'
  | 'Maternity / Paternity Leave'
  | 'Compensatory Off'
  | 'Unpaid Leave';

export type LeaveStatus = 'planned' | 'pending' | 'approved' | 'rejected';

export type TimeHorizon = 'quarterly' | 'half_yearly' | 'yearly';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type HalfYear = 'H1' | 'H2';

export interface LeaveRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  pod_id?: string;
  pod_name?: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  days_count: number;
  quarter: Quarter;
  half_year: HalfYear;
  year: number; // 2026, 2027
  reason: string;
  status: LeaveStatus;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export type HolidayType = 'mandatory' | 'optional' | 'restricted';

export interface CompanyHoliday {
  id: string;
  organization_id: string;
  name: string;
  date: string; // YYYY-MM-DD
  day_of_week: string; // "Monday", "Friday", etc.
  type: HolidayType; // mandatory | optional
  quarter: Quarter;
  half_year: HalfYear;
  year: number;
  description?: string;
}

export interface EmployeeLeaveBalance {
  employee_id: string;
  employee_name: string;
  total_quota: number; // Annual quota (e.g. 24 days)
  taken_count: number;
  planned_count: number;
  remaining_count: number;
  optional_holidays_quota: number; // e.g. 2 days
  optional_holidays_taken: number;
}
