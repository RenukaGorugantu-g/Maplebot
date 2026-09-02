// ==============================================================================
// MapleBot: Executive Performance Reporting & Work Analytics Type Definitions
// Complete 17-Column Structure + Multi-Tier Workflow + Fact/Insight/Gap Schema
// ==============================================================================

export type WorkCategory =
  | 'Development'
  | 'SEO'
  | 'Sales'
  | 'LMS'
  | 'Marketing'
  | 'Coordination'
  | 'Design'
  | 'Operations'
  | 'Quality Assurance'
  | 'Client Support'
  | 'Other';

export type WorkStatus = 'completed' | 'in_progress' | 'pending' | 'blocked';
export type WorkPriority = 'low' | 'medium' | 'high' | 'critical';

export type WorkflowStatus =
  | 'draft'
  | 'submitted'
  | 'pod_lead_reviewed'
  | 'manager_reviewed';

export type DeliveryStatus =
  | 'pending'
  | 'completed_early'
  | 'completed_on_time'
  | 'delayed';

export type QualityRating =
  | 'Excellent'
  | 'Good'
  | 'Satisfactory'
  | 'Needs Improvement'
  | 'Poor';

export type ReportType = 'individual' | 'team' | 'monthly' | 'quarterly' | 'kra_kpi' | 'project';
export type ReportStatus = 'draft' | 'reviewed' | 'approved';

export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type KpiStatus = 'exceeded' | 'met' | 'near_target' | 'needs_attention' | 'not_measured';

export type PerformanceLevel =
  | 'Exceptional'
  | 'Strong Contributor'
  | 'Meets Expectations'
  | 'Needs Improvement'
  | 'Insufficient Data';

// --- AUDIT TRAIL ENTRY ---
export interface WorkLogAuditEntry {
  field: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  changed_at: string;
}

// --- ATOMIC STRUCTURED WORK LOG (17 EXACT REQUIRED COLUMNS + WORKFLOW METADATA) ---
export interface PerformanceWorkLog {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string; // 2. Name
  department_id?: string;
  department: string;
  pod_id?: string;
  pod_name?: string;

  // 1. WORK INFORMATION (POD MEMBER ENTERS 9 FIELDS + CHECK-IN TIME)
  date: string; // 1. Date (YYYY-MM-DD)
  submission_time?: string; // Check-in Time / Update Given Time (e.g. "10:15 AM")
  checkin_time?: string; // Compatibility alias
  project_name: string; // 3. Project Name (alias: project)
  project?: string; // Compatibility alias
  task: string; // 4. Task (alias: task_title)
  task_title?: string; // Compatibility alias
  task_description?: string;
  assigned_date: string; // 5. Assigned Date (YYYY-MM-DD)
  time_invested: number; // 8. Time Invested (Hours numeric, alias: duration_hours)
  duration_hours?: number; // Compatibility alias
  unit_count_completed: number; // 9. Unit Count Completed (Numeric)
  review_assigned_date: string; // 10. Review Assigned Date (YYYY-MM-DD)
  comments?: string; // 17. Comments (Context, notes, blockers, achievements)
  category?: WorkCategory;
  priority?: WorkPriority;
  deliverable?: string;
  outcome?: string;
  impact?: string;

  // 2. POD LEAD REVIEW (5 FIELDS ADDED BY POD LEAD)
  expected_completion_date?: string; // 6. Expected Completion Date (YYYY-MM-DD)
  completed_date?: string; // 7. Completed Date (YYYY-MM-DD)
  review_completed_date?: string; // 11. Review Completed Date (YYYY-MM-DD)
  reviewer?: string; // 12. Reviewer (alias: reviewer_name)
  reviewer_id?: string;
  reviewer_name?: string; // Compatibility alias
  error_count?: number; // 13. Error (Numeric count, alias: errors)
  errors?: number; // Compatibility alias

  // 3. MANAGER PERFORMANCE (3 FIELDS ADDED/CALCULATED BY MANAGER)
  quality?: number | QualityRating; // 14. Quality (1-5 or Excellent/Good/Satisfactory/Needs Improvement/Poor)
  tat?: string; // 15. TAT (Turnaround Time: e.g. "3 days" or "Not Available")
  tat_days?: number;
  efficiency?: number | string; // 16. Efficiency (e.g. 86 or "Not Available")

  // STATUS & WORKFLOW METADATA
  status?: WorkStatus;
  workflow_status: WorkflowStatus; // 'draft' | 'submitted' | 'pod_lead_reviewed' | 'manager_reviewed'
  delivery_status: DeliveryStatus; // 'pending' | 'completed_early' | 'completed_on_time' | 'delayed'
  delay_days?: number;
  review_tat_days?: number;
  error_rate?: number; // Errors / Unit Count Completed (%)
  units_per_hour?: number; // Unit Count Completed / Time Invested

  // WORKFLOW RESPONSIBILITY AUDIT
  submitted_by?: string;
  submitted_at?: string;
  pod_lead_reviewed_by?: string;
  pod_lead_reviewed_at?: string;
  manager_reviewed_by?: string;
  manager_reviewed_at?: string;
  audit_trail?: WorkLogAuditEntry[];

  source_update_id?: string;
  created_at: string;
  updated_at: string;
}

// --- KRA & KPI DEFINITION ---
export interface PerformanceKPI {
  id: string;
  organization_id: string;
  pod_id?: string;
  employee_id?: string; // Optional: individual KPI or pod-wide KPI
  kra: string; // Key Result Area (e.g. "Development", "SEO", "LMS Delivery")
  kpi: string; // Key Performance Indicator (e.g. "Task Completion Rate", "Course Deliverables")
  target_value?: number;
  target_unit?: string; // '%', 'tasks', 'hours', 'deliverables', 'courses'
  actual_value?: number;
  status: KpiStatus;
  measurement: string; // e.g. "Completed Tasks / Total Tasks"
  frequency: KpiFrequency;
  created_at: string;
  updated_at: string;
}

// --- PROJECT & CATEGORY SUMMARY BREAKDOWN ---
export interface ProjectPerformanceItem {
  project: string;
  tasks: number;
  completed: number;
  units: number;
  time_hours: number;
  errors: number;
  quality: number | string;
  avg_tat: string;
  efficiency: number | string;
  completion_rate: number;
}

export interface ProjectBreakdownItem {
  project: string;
  total_tasks: number;
  completed_tasks: number;
  total_hours: number;
  completion_rate: number;
}

export interface CategoryBreakdownItem {
  category: WorkCategory | string;
  total_tasks: number;
  completed_tasks: number;
  total_hours: number;
  completion_rate: number;
}

// --- ACTIVITY -> OUTCOME -> IMPACT MATRIX ---
export interface ActivityOutcomeImpact {
  activity: string;
  outcome: string;
  impact: string;
  project?: string;
  date?: string;
}

// --- DELAYED TASK AUDIT ITEM ---
export interface DelayedTaskItem {
  task: string;
  project: string;
  expected_date: string;
  completed_date: string;
  delay_days: number;
  delay_label: string;
  reason: string;
}

// --- QUALITY PERFORMANCE SUMMARY ---
export interface QualityPerformanceSummary {
  average_quality: number | string;
  total_errors: number;
  error_rate_percent: number | string;
  error_free_tasks: number;
  tasks_with_errors: number;
  interpretation?: string;
}

// --- REVIEW PERFORMANCE SUMMARY ---
export interface ReviewPerformanceSummary {
  reviews_assigned: number;
  reviews_completed: number;
  pending_reviews: number;
  average_review_tat: string;
  review_completion_rate: number;
}

// --- UNIT PRODUCTIVITY ITEM ---
export interface UnitProductivityItem {
  project: string;
  units: number;
  hours: number;
  units_per_hour: number | string;
}

// --- DEMONSTRATED STRENGTH ITEM ---
export interface DemonstratedStrengthItem {
  area: 'Delivery' | 'Quality' | 'Productivity' | 'Timeliness' | 'Technical' | string;
  title: string;
  evidence: string;
}

// --- AREA REQUIRING ATTENTION ---
export interface AttentionAreaItem {
  area: 'Timeliness' | 'Quality' | 'Review' | 'Workload' | 'Process' | string;
  finding: string;
  evidence: string;
  recommendation: string;
}

// --- DATA TRANSPARENCY PROTOCOL ---
export interface FactInsightGap {
  facts: string[];
  insights: string[];
  data_gaps: string[];
}

// --- WEIGHTED SCORECARD BREAKDOWN ---
export interface ScoreComponent {
  name: string;
  weight_percent: number;
  raw_score: number | null;
  weighted_score: number | null;
  is_evaluated: boolean;
  notes: string;
}

export interface PerformanceScoreSummary {
  total_score: number | null;
  max_score: number;
  evaluation_status: 'Fully Evaluated' | 'Partially Evaluated' | 'Not Yet Evaluated';
  overall_assessment: PerformanceLevel;
  components: {
    task_completion: ScoreComponent;
    on_time_delivery: ScoreComponent;
    priority_work: ScoreComponent;
    kpi_achievement: ScoreComponent;
    manager_evaluation: ScoreComponent;
  };
}

// --- DETERMINISTIC METRICS SNAPSHOT ---
export interface PerformanceSnapshotMetrics {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  total_hours: number;
  units_completed: number;
  errors_count: number;
  average_quality: number | string;
  average_tat: string;
  efficiency: number | string;
  projects_count: number;
  high_priority_tasks: number;
  pending_tasks: number;
  blocked_tasks: number;
  delayed_tasks: number;
  early_tasks: number;
  on_time_tasks: number;
}

// --- COMPLETE EXECUTIVE REPORT DATA (MAPLE AI SYNTHESIZED) ---
export interface ExecutiveReportData {
  report_title: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  department: string;
  pod_id?: string;
  pod_name: string;
  manager_name: string;
  reporting_period: string;
  period_start: string;
  period_end: string;
  generated_at: string;

  // 1. EXECUTIVE SUMMARY
  executive_summary: {
    overview_text: string;
    velocity_assessment: string;
    overall_assessment: PerformanceLevel;
  };

  // 2. PERFORMANCE SNAPSHOT
  snapshot: PerformanceSnapshotMetrics;

  // 3. PROJECT PERFORMANCE BREAKDOWN
  project_performance: ProjectPerformanceItem[];

  // 4. DELIVERY PERFORMANCE & TIMELINESS
  delivery_performance: {
    completed_early: number;
    completed_on_time: number;
    delayed: number;
    pending: number;
    summary_text: string;
  };
  delayed_tasks: DelayedTaskItem[];

  // 5. QUALITY PERFORMANCE
  quality_performance: QualityPerformanceSummary;

  // 6. REVIEW PERFORMANCE
  review_performance: ReviewPerformanceSummary;

  // 7. UNIT PRODUCTIVITY
  unit_productivity: UnitProductivityItem[];

  // 8. KEY CONTRIBUTIONS GROUPED BY PROJECT
  key_contributions: Array<{
    project: string;
    summary: string;
    highlights: string[];
  }>;

  // 9. ACTIVITY -> OUTCOME -> IMPACT MATRIX
  activity_outcome_impact: ActivityOutcomeImpact[];

  // 10. DEMONSTRATED STRENGTHS (EVIDENCE-BASED)
  demonstrated_strengths: DemonstratedStrengthItem[];

  // 11. AREAS REQUIRING ATTENTION
  areas_requiring_attention: AttentionAreaItem[];

  // 12. EXECUTIVE RECOMMENDATION
  executive_recommendation: {
    management_conclusion: string;
    next_cycle_focus: string;
  };

  // 13. DATA TRANSPARENCY PROTOCOL
  transparency: FactInsightGap;

  // 14. WEIGHTED SCORECARD
  score_summary: PerformanceScoreSummary;

  // 15. KRA / KPI TABLE
  kpi_metrics: Array<{
    kra: string;
    kpi: string;
    target?: string;
    actual?: string;
    status: KpiStatus;
    frequency: string;
    notes?: string;
  }>;
}

// --- STORED / PERSISTED REPORT RECORD ---
export interface PerformanceReport {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  pod_id?: string;
  pod_name?: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  period_label: string;
  report_data: ExecutiveReportData;
  performance_score: number | null;
  status: ReportStatus; // 'draft' | 'reviewed' | 'approved'
  manager_rating?: number; // 1 to 5 scale
  manager_comments?: string;
  key_strengths_validated?: string[];
  development_areas?: string[];
  next_period_objectives?: string[];
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_at?: string;
  generated_at: string;
  updated_at: string;
}

// --- TEAM AGGREGATE EXECUTIVE REPORT DATA ---
export interface TeamExecutiveReportData {
  team_name: string;
  pod_id?: string;
  lead_name: string;
  manager_name: string;
  reporting_period: string;
  period_start: string;
  period_end: string;
  generated_at: string;

  team_summary: {
    total_members: number;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    total_hours: number;
    total_units: number;
    total_errors: number;
    average_quality: number | string;
    average_tat: string;
    active_projects_count: number;
    pending_tasks: number;
    delayed_tasks: number;
    at_risk_tasks: number;
  };

  members_summary: Array<{
    employee_id: string;
    employee_name: string;
    role: string;
    total_tasks: number;
    completed_tasks: number;
    total_hours: number;
    total_units: number;
    completion_rate: number;
    quality: number | string;
    errors: number;
    tat: string;
    efficiency: number | string;
    projects_count: number;
    active_blockers_count: number;
    performance_score: number | null;
  }>;

  management_attention: {
    high_priority_pending: Array<{
      task: string;
      employee: string;
      priority: string;
      project: string;
      reason: string;
    }>;
    repeated_blockers: Array<{
      blocker: string;
      affected_employee: string;
      impact: string;
      suggested_resolution: string;
    }>;
  };

  transparency: FactInsightGap;
}
