// ==============================================================================
// MapleBot: Database & Application TypeScript Definitions
// ==============================================================================

export type UserRole = 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'deactivated' | 'invited';
export type UpdateStatus = 'on_track' | 'at_risk' | 'blocked';
export type UpdatePriority = 'low' | 'medium' | 'high';
export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BlockerStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type BlockerCategory = 'Task' | 'Project' | 'Client' | 'Team' | 'Access' | 'Dependency' | 'Other';
export type KudosCategory = 'Teamwork' | 'Ownership' | 'Innovation' | 'Customer Focus' | 'Helping Others' | 'Great Work';
export type SprintStatus = 'upcoming' | 'active' | 'completed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Pod {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  manager_id?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  // Joins
  manager?: Profile;
  members_count?: number;
  participation_rate?: number;
  active_blockers_count?: number;
}

export interface Profile {
  id: string;
  auth_user_id?: string;
  organization_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
  pod_id?: string;
  manager_id?: string;
  timezone: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  // Joins
  pod?: Pod;
  manager?: Profile;
  last_update?: Update;
}

export interface Checkin {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'sprint';
  active: boolean;
  start_time: string;
  deadline_time: string;
  reminder_time: string;
  days: string[];
  timezone: string;
  pod_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  questions?: CheckinQuestion[];
}

export interface CheckinQuestion {
  id: string;
  checkin_id: string;
  question: string;
  question_type: 'text' | 'boolean' | 'select' | 'slider' | 'number';
  required: boolean;
  sort_order: number;
  created_at: string;
}

export interface Update {
  id: string;
  organization_id: string;
  checkin_id: string;
  profile_id: string;
  pod_id?: string;
  update_date: string;
  yesterday: string;
  today: string;
  blocker?: string;
  has_blocker: boolean;
  blocker_category?: BlockerCategory;
  support_needed?: string;
  status: UpdateStatus;
  priority: UpdatePriority;
  progress_percent: number;
  submitted_at: string;
  updated_at: string;
  created_at: string;
  // Joins
  profile?: Profile;
  pod?: Pod;
}

export interface Blocker {
  id: string;
  organization_id: string;
  update_id?: string;
  reported_by: string;
  pod_id?: string;
  title: string;
  description?: string;
  category: BlockerCategory;
  severity: BlockerSeverity;
  status: BlockerStatus;
  assigned_to?: string;
  created_at: string;
  resolved_at?: string;
  updated_at: string;
  // Joins
  reporter?: Profile;
  assignee?: Profile;
  pod?: Pod;
  comments?: BlockerComment[];
}

export interface BlockerComment {
  id: string;
  blocker_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: Profile;
}

export interface Kudos {
  id: string;
  organization_id: string;
  sender_id: string;
  recipient_id: string;
  pod_id?: string;
  category: KudosCategory;
  message: string;
  created_at: string;
  // Joins
  sender?: Profile;
  recipient?: Profile;
  pod?: Pod;
}

export interface Sprint {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Aggregates
  total_updates?: number;
  participation_rate?: number;
  blockers_count?: number;
  resolved_blockers_count?: number;
  kudos_count?: number;
}

export interface NotificationItem {
  id: string;
  organization_id: string;
  profile_id: string;
  type: 'reminder' | 'submitted' | 'blocker_assigned' | 'blocker_resolved' | 'kudos_received' | 'weekly_report' | 'sprint_report';
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface GoogleChatSettings {
  id: string;
  organization_id: string;
  enabled: boolean;
  space_id?: string;
  space_name?: string;
  webhook_url?: string;
  report_time: string;
  daily_reports: boolean;
  weekly_reports: boolean;
  sprint_reports: boolean;
  blocker_alerts: boolean;
  kudos_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id?: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  actor?: Profile;
}

export interface AIResponsePayload {
  intent: string;
  question: string;
  timestamp: string;
  summaryTitle: string;
  metrics: {
    totalAnalyzed: number;
    activeBlockersCount: number;
    onTrackCount: number;
    atRiskCount: number;
  };
  insights: Array<{
    category: string;
    type: 'success' | 'warning' | 'info' | 'danger';
    points: string[];
  }>;
  recommendedFollowUps: string[];
  flaggedBlockerSignals?: Array<{
    profileName: string;
    podName: string;
    matchedKeyword: string;
    snippet: string;
  }>;
}
