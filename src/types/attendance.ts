// ==============================================================================
// MapleBot: Attendance & Daily Action Item Type Definitions
// Supports Morning Login/Check-in, Evening Logout/Check-out, and WPI Carry-Forward
// ==============================================================================

export type DailySessionStatus = 'draft' | 'checked_in' | 'checked_out';

export type ActionItemStatus = 'wpi' | 'completed';

export interface DailyWorkSession {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  pod_id?: string;
  pod_name?: string;
  work_date: string; // YYYY-MM-DD (IST)
  checkin_at?: string; // ISO 8601 server timestamp
  checkin_time?: string; // Formatted display time, e.g. "09:32 AM"
  checkout_at?: string; // ISO 8601 server timestamp
  checkout_time?: string; // Formatted display time, e.g. "06:41 PM"
  status: DailySessionStatus;
  total_tasks_count: number;
  completed_tasks_count: number;
  wpi_tasks_count: number;
  total_hours_invested: number;
  summary_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyActionItem {
  id: string;
  session_id?: string;
  organization_id: string;
  employee_id: string;
  work_date: string; // YYYY-MM-DD
  project_name: string;
  task_title: string;
  task_description?: string;
  status: ActionItemStatus;
  is_carried_forward: boolean;
  carried_from_date?: string; // Source work date if carried forward
  carried_from_item_id?: string;
  carried_from_reason?: string; // Previous WPI reason for context
  wpi_reason?: string; // Mandatory when status is 'wpi' at end of day
  next_action?: string; // Continuation plan
  completion_comment?: string; // Optional comment when completed
  time_invested: number; // Hours invested today
  unit_count: number; // Deliverables count (default 1)
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type DailyWorkflowState =
  | 'not_started' // Before morning submission
  | 'action_items_draft' // Entering morning action items
  | 'checked_in' // Morning action items submitted & login timestamp locked
  | 'end_of_day_pending' // Evening review mode: updating statuses & comments
  | 'checked_out'; // End of day submitted & logout timestamp locked

export interface DailyAttendanceSummaryItem {
  employee_id: string;
  employee_name: string;
  pod_id?: string;
  pod_name?: string;
  work_date: string;
  session?: DailyWorkSession;
  action_items: DailyActionItem[];
  status: 'not_checked_in' | 'in_progress' | 'checked_out';
  checkin_time?: string;
  checkout_time?: string;
  completed_count: number;
  wpi_count: number;
  total_hours: number;
}
