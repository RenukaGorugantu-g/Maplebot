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
  deliverables_status?: string; // e.g. "Yes — All Completed" | "In Progress (Handover given)" | "Pending"
  deliverables_notes?: string; // Specific deliverables completed or status details
  backup_person?: string; // Designated colleague / teammate
  backup_plan?: string; // Handover details, instructions, or coverage responsibilities
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

export interface LeaveBalanceRecord {
  id: string;
  user_id: string;
  year: number;
  total_quota: number; // e.g. 12 (editable in Supabase)
  approved_taken: number;
  available_balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeLeaveBalance {
  employee_id: string;
  employee_name: string;
  total_quota: number; // Annual quota from DB (default 12)
  taken_count: number; // Approved taken count
  pending_count: number; // Pending / planned requests count
  planned_count: number; // Alias for backward compatibility
  available_balance: number; // total_quota - taken_count
  remaining_count: number; // Alias for backward compatibility
  optional_holidays_quota?: number;
  optional_holidays_taken?: number;
}
