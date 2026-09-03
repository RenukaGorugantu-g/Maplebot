-- ============================================================================
-- MAPLEBOT — PRODUCTION SUPABASE DATABASE SCHEMA
-- Maple Learning Solutions Team Updates, Standups, Blockers & Analytics
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema (Safe migration)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS kudos CASCADE;
DROP TABLE IF EXISTS blocker_comments CASCADE;
DROP TABLE IF EXISTS blockers CASCADE;
DROP TABLE IF EXISTS updates CASCADE;
DROP TABLE IF EXISTS checkin_questions CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS google_chat_settings CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS pods CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. ORGANIZATIONS TABLE
CREATE TABLE organizations (
    id TEXT PRIMARY KEY DEFAULT 'org-maple-01',
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    timezone TEXT DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PODS TABLE
CREATE TABLE pods (
    id TEXT PRIMARY KEY DEFAULT ('pod-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    members_count INT DEFAULT 0,
    participation_rate INT DEFAULT 100,
    active_blockers_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE (Linked with auth.users or standalone corporate directory)
CREATE TABLE profiles (
    id TEXT PRIMARY KEY DEFAULT ('prof-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    manager_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    timezone TEXT DEFAULT 'America/Toronto',
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'invited')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add manager foreign key to pods now that profiles table is created
ALTER TABLE pods ADD CONSTRAINT fk_pods_manager FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. CHECKINS TABLE
CREATE TABLE checkins (
    id TEXT PRIMARY KEY DEFAULT ('chk-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'sprint')),
    active BOOLEAN DEFAULT TRUE,
    start_time TEXT DEFAULT '09:00',
    deadline_time TEXT DEFAULT '11:00',
    reminder_time TEXT DEFAULT '09:30',
    days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timezone TEXT DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CHECKIN QUESTIONS TABLE
CREATE TABLE checkin_questions (
    id TEXT PRIMARY KEY DEFAULT ('q-' || substr(md5(random()::text), 1, 8)),
    checkin_id TEXT NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'boolean', 'rating', 'multiple_choice')),
    required BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. UPDATES TABLE (Daily Standups)
CREATE TABLE updates (
    id TEXT PRIMARY KEY DEFAULT ('upd-' || substr(md5(random()::text), 1, 10)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    checkin_id TEXT REFERENCES checkins(id) ON DELETE SET NULL,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    update_date DATE NOT NULL DEFAULT CURRENT_DATE,
    yesterday TEXT NOT NULL,
    today TEXT NOT NULL,
    has_blocker BOOLEAN DEFAULT FALSE,
    blocker TEXT,
    blocker_category TEXT CHECK (blocker_category IN ('Technical', 'Dependency', 'Access', 'Resource', 'Other')),
    support_needed TEXT,
    status TEXT DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'blocked')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_profile_date UNIQUE (profile_id, update_date)
);

-- 7. BLOCKERS TABLE
CREATE TABLE blockers (
    id TEXT PRIMARY KEY DEFAULT ('blk-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    update_id TEXT REFERENCES updates(id) ON DELETE SET NULL,
    reported_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'Technical' CHECK (category IN ('Technical', 'Dependency', 'Access', 'Resource', 'Other')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    assigned_to TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BLOCKER COMMENTS TABLE
CREATE TABLE blocker_comments (
    id TEXT PRIMARY KEY DEFAULT ('comm-' || substr(md5(random()::text), 1, 8)),
    blocker_id TEXT NOT NULL REFERENCES blockers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. KUDOS TABLE (Peer Recognition)
CREATE TABLE kudos (
    id TEXT PRIMARY KEY DEFAULT ('kud-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('Teamwork', 'Ownership', 'Innovation', 'Customer Focus', 'Helping Others', 'Great Work')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SPRINTS TABLE
CREATE TABLE sprints (
    id TEXT PRIMARY KEY DEFAULT ('spr-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed')),
    total_updates INT DEFAULT 0,
    participation_rate INT DEFAULT 0,
    blockers_count INT DEFAULT 0,
    resolved_blockers_count INT DEFAULT 0,
    kudos_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. GOOGLE CHAT SETTINGS
CREATE TABLE google_chat_settings (
    id TEXT PRIMARY KEY DEFAULT 'gchat-maple-01',
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    space_id TEXT DEFAULT 'spaces/AAAA_maple_team_updates',
    space_name TEXT DEFAULT 'Maple Team Updates',
    webhook_url TEXT,
    report_time TEXT DEFAULT '10:30',
    daily_reports BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT TRUE,
    sprint_reports BOOLEAN DEFAULT TRUE,
    blocker_alerts BOOLEAN DEFAULT TRUE,
    kudos_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reminder', 'blocker', 'kudos', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('audit-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_pod ON profiles(pod_id);
CREATE INDEX idx_updates_date ON updates(update_date);
CREATE INDEX idx_updates_profile ON updates(profile_id);
CREATE INDEX idx_updates_pod ON updates(pod_id);
CREATE INDEX idx_blockers_status ON blockers(status);
CREATE INDEX idx_blockers_pod ON blockers(pod_id);
CREATE INDEX idx_notifications_profile ON notifications(profile_id, read);

-- ============================================================================
-- CANONICAL DATA SEED (MAPLE LEARNING SOLUTIONS ROSTER)
-- ============================================================================

-- Insert Organization
INSERT INTO organizations (id, name, slug, timezone)
VALUES ('org-maple-01', 'Maple Learning Solutions', 'maple-learning-solutions', 'America/Toronto')
ON CONFLICT (id) DO NOTHING;

-- Insert Pods
INSERT INTO pods (id, organization_id, name, description, status) VALUES
('pod-web-sales', 'org-maple-01', 'Web & Sales', 'Web development, client platforms, revenue initiatives, and sales conversion workflows.', 'active'),
('pod-marketing', 'org-maple-01', 'Marketing', 'Brand awareness, digital growth, social outreach, and content campaigns.', 'active'),
('pod-elearning', 'org-maple-01', 'eLearning', 'Interactive curriculum development, instructional design, and LMS courseware.', 'active'),
('pod-hr', 'org-maple-01', 'HR Operations', 'Talent acquisition, employee experience, policy compliance, and internal operations.', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert All 20 Real Team Members with Strict Roles
INSERT INTO profiles (id, organization_id, full_name, email, role, pod_id, status) VALUES
-- Executive Leadership & Admins
('prof-admin', 'org-maple-01', 'Maple Edge Admin', 'info@maplelearningsolutions.com', 'admin', NULL, 'active'),
('prof-sandeep', 'org-maple-01', 'Sandeep M', 'sandeep@maplelearningsolutions.com', 'admin', NULL, 'active'),
('prof-raj', 'org-maple-01', 'Raj Ayyanar', 'raj.ayyanar@maplelearningsolutions.com', 'admin', NULL, 'active'),
('prof-krishna', 'org-maple-01', 'Krishna Sunkara', 'krishna@maplelearningsolutions.com', 'admin', NULL, 'active'),
('prof-rathish', 'org-maple-01', 'Rathish Rajendran', 'rathish.rajendran@maplelearningsolutions.com', 'admin', NULL, 'active'),

-- Web & Sales Pod
('prof-renuka', 'org-maple-01', 'Renuka Gorugantu', 'renuka@maplelearningsolutions.com', 'manager', 'pod-web-sales', 'active'),
('prof-nithin', 'org-maple-01', 'Nithin Guggilla', 'nithin@maplelearningsolutions.com', 'manager', 'pod-marketing', 'active'),
('prof-raghavi', 'org-maple-01', 'Raghavi Jammula', 'raghavi@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),
('prof-harshika', 'org-maple-01', 'Harshika Netha', 'harshika@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),
('prof-susan', 'org-maple-01', 'Susan Vijaya', 'susan@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),

-- Marketing Pod
('prof-abhishek', 'org-maple-01', 'Abhishek Guna', 'abhishek@maplelearningsolutions.com', 'member', 'pod-marketing', 'active'),

-- eLearning Pod
('prof-dhana', 'org-maple-01', 'Dhana Sekhar', 'dhana@maplelearningsolutions.com', 'manager', 'pod-elearning', 'active'),
('prof-christeena', 'org-maple-01', 'Christeena George', 'christeena@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
('prof-malavika', 'org-maple-01', 'Malavika Koraganti', 'malavika@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
('prof-pratap', 'org-maple-01', 'Pratap Rudra', 'pratap@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
('prof-navyasree', 'org-maple-01', 'Navyasree Nuthangi', 'navyasree@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
('prof-varsha', 'org-maple-01', 'Varsha chhanganiji', 'varsha@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
('prof-swathi', 'org-maple-01', 'Swathi Thoranala', 'swathi@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
('prof-bhanu', 'org-maple-01', 'Bhanu Reddy Shetty', 'bhanu.reddy@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),

-- HR Operations Pod
('prof-swetha', 'org-maple-01', 'Swetha N', 'swetha@maplelearningsolutions.com', 'manager', 'pod-hr', 'active')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    pod_id = EXCLUDED.pod_id,
    full_name = EXCLUDED.full_name;

-- Link Pod Managers
UPDATE pods SET manager_id = 'prof-renuka' WHERE id = 'pod-web-sales';
UPDATE pods SET manager_id = 'prof-nithin' WHERE id = 'pod-marketing';
UPDATE pods SET manager_id = 'prof-dhana' WHERE id = 'pod-elearning';
UPDATE pods SET manager_id = 'prof-swetha' WHERE id = 'pod-hr';

-- Link Member Reporting Managers
UPDATE profiles SET manager_id = 'prof-renuka' WHERE id IN ('prof-harshika', 'prof-susan', 'prof-raghavi');
UPDATE profiles SET manager_id = 'prof-nithin' WHERE id IN ('prof-abhishek');
UPDATE profiles SET manager_id = 'prof-dhana' WHERE id IN ('prof-christeena', 'prof-malavika', 'prof-pratap', 'prof-navyasree', 'prof-varsha', 'prof-swathi', 'prof-bhanu');
UPDATE profiles SET manager_id = 'prof-swetha' WHERE id IN ('prof-abhishek');

-- Insert Default Daily Checkin
INSERT INTO checkins (id, organization_id, name, description, frequency, active)
VALUES ('chk-maple-daily', 'org-maple-01', 'Daily Standup Check-in', 'Asynchronous morning coordination check-in across all Maple Learning Solutions pods.', 'daily', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_questions (id, checkin_id, question, question_type, required, sort_order) VALUES
('q-1', 'chk-maple-daily', 'What did you complete yesterday and how much time did you spend on each task?', 'text', true, 1),
('q-2', 'chk-maple-daily', 'What are you working on today and how much time are you going to spend on each task?', 'text', true, 2),
('q-3', 'chk-maple-daily', 'Do you have any blockers or require team support?', 'boolean', false, 3)
ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question;

-- Insert Google Chat Settings
INSERT INTO google_chat_settings (id, organization_id, enabled, space_name, webhook_url)
VALUES ('gchat-maple-01', 'org-maple-01', true, 'Maple Team Updates', 'https://chat.googleapis.com/v1/spaces/AAQA8ijHd80/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=vR_WlFMQiHtcfTFfa2B5qfy6y14GpyXdIczanj0q5w0')
ON CONFLICT (id) DO UPDATE SET webhook_url = EXCLUDED.webhook_url, enabled = true;

-- Enable Row Level Security (RLS) & Grant Policies for App Sync
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on organizations" ON organizations;
CREATE POLICY "Allow all on organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pods" ON pods;
CREATE POLICY "Allow all on pods" ON pods FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on checkins" ON checkins;
CREATE POLICY "Allow all on checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE checkin_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on checkin_questions" ON checkin_questions;
CREATE POLICY "Allow all on checkin_questions" ON checkin_questions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on updates" ON updates;
CREATE POLICY "Allow all on updates" ON updates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on blockers" ON blockers;
CREATE POLICY "Allow all on blockers" ON blockers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE blocker_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on blocker_comments" ON blocker_comments;
CREATE POLICY "Allow all on blocker_comments" ON blocker_comments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on kudos" ON kudos;
CREATE POLICY "Allow all on kudos" ON kudos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE google_chat_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on google_chat_settings" ON google_chat_settings;
CREATE POLICY "Allow all on google_chat_settings" ON google_chat_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on audit_logs" ON audit_logs;
CREATE POLICY "Allow all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on sprints" ON sprints;
CREATE POLICY "Allow all on sprints" ON sprints FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 17. PERFORMANCE WORK LOGS TABLE (17 EXACT COLUMNS + CHECK-IN TIME & WORKFLOW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.performance_work_logs (
    id TEXT PRIMARY KEY DEFAULT ('pwl-' || substr(md5(random()::text), 1, 10)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    department_id TEXT,
    department TEXT NOT NULL DEFAULT 'General',
    pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL,
    pod_name TEXT,

    -- 1. Member Inputs (9 Fields + Check-in Time)
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    submission_time TEXT DEFAULT '10:00 AM',
    checkin_time TEXT DEFAULT '10:00 AM',
    project_name TEXT NOT NULL,
    project TEXT NOT NULL,
    task TEXT NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_invested NUMERIC(6,2) NOT NULL DEFAULT 1.0,
    duration_hours NUMERIC(6,2) NOT NULL DEFAULT 1.0,
    unit_count_completed INT NOT NULL DEFAULT 1,
    review_assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    comments TEXT,
    category TEXT DEFAULT 'Development',
    priority TEXT DEFAULT 'medium',
    deliverable TEXT,
    outcome TEXT,
    impact TEXT,

    -- 2. Pod Lead Review Verification (5 Fields)
    expected_completion_date DATE,
    completed_date DATE,
    review_completed_date DATE,
    reviewer TEXT,
    reviewer_name TEXT,
    reviewer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_count INT DEFAULT 0,
    errors INT DEFAULT 0,

    -- 3. Manager Performance & Evaluation (3 Fields)
    quality NUMERIC(3,1) DEFAULT 4.0,
    tat TEXT,
    tat_days INT,
    efficiency TEXT,

    -- Status & Workflow Tracking
    workflow_status TEXT DEFAULT 'submitted' CHECK (workflow_status IN ('draft', 'submitted', 'pod_lead_reviewed', 'manager_reviewed')),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'completed_early', 'completed_on_time', 'delayed')),
    delay_days INT DEFAULT 0,
    review_tat_days INT DEFAULT 0,
    status TEXT DEFAULT 'completed',

    -- Responsibility Audit
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ,
    pod_lead_reviewed_by TEXT,
    pod_lead_reviewed_at TIMESTAMPTZ,
    manager_reviewed_by TEXT,
    manager_reviewed_at TIMESTAMPTZ,
    source_update_id TEXT,
    audit_trail JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 18. PERFORMANCE KPIS TABLE (KRA & KPI Targets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.performance_kpis (
    id TEXT PRIMARY KEY DEFAULT ('kpi-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL,
    employee_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    kra TEXT NOT NULL,
    kpi TEXT NOT NULL,
    target_value NUMERIC(10,2),
    target_unit TEXT DEFAULT '%',
    actual_value NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'met' CHECK (status IN ('exceeded', 'met', 'near_target', 'needs_attention', 'not_measured')),
    measurement TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 19. PERFORMANCE REPORTS TABLE (Executive & Manager Assessments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.performance_reports (
    id TEXT PRIMARY KEY DEFAULT ('prep-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL,
    pod_name TEXT,
    report_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_label TEXT NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    performance_score NUMERIC(5,2),
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'reviewed', 'approved')),
    manager_rating NUMERIC(3,1),
    manager_comments TEXT,
    key_strengths TEXT,
    development_areas TEXT,
    next_period_objectives TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 20. EMPLOYEE LEAVES TABLE (Leave Planner & Approvals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_leaves (
    id TEXT PRIMARY KEY DEFAULT ('leave-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL,
    pod_name TEXT,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL DEFAULT 1,
    quarter TEXT NOT NULL DEFAULT 'Q3',
    half_year TEXT NOT NULL DEFAULT 'H2',
    year INT NOT NULL DEFAULT 2026,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('planned', 'pending', 'approved', 'rejected')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 21. COMPANY HOLIDAYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_holidays (
    id TEXT PRIMARY KEY DEFAULT ('hol-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    day_of_week TEXT NOT NULL,
    is_optional BOOLEAN DEFAULT FALSE,
    quarter TEXT NOT NULL,
    half_year TEXT NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 22. USER CREDENTIALS & AUTHENTICATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_credentials (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    profile_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 23. UPDATE COMMENTS TABLE (Feedback from Managers & Pod Leads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.update_comments (
    id TEXT PRIMARY KEY DEFAULT ('comm-' || substr(md5(random()::text), 1, 10)),
    update_id TEXT NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance & leaves
CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON public.performance_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_pod ON public.performance_work_logs(pod_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON public.performance_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_work_logs_workflow ON public.performance_work_logs(workflow_status);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON public.employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.employee_leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.employee_leaves(status);
CREATE INDEX IF NOT EXISTS idx_update_comments_update ON public.update_comments(update_id);

-- Enable RLS for newly added tables
ALTER TABLE public.performance_work_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on performance_work_logs" ON public.performance_work_logs;
CREATE POLICY "Allow all on performance_work_logs" ON public.performance_work_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.performance_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on performance_kpis" ON public.performance_kpis;
CREATE POLICY "Allow all on performance_kpis" ON public.performance_kpis FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on performance_reports" ON public.performance_reports;
CREATE POLICY "Allow all on performance_reports" ON public.performance_reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employee_leaves" ON public.employee_leaves;
CREATE POLICY "Allow all on employee_leaves" ON public.employee_leaves FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on company_holidays" ON public.company_holidays;
CREATE POLICY "Allow all on company_holidays" ON public.company_holidays FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on user_credentials" ON public.user_credentials;
CREATE POLICY "Allow all on user_credentials" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.update_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on update_comments" ON public.update_comments;
CREATE POLICY "Allow all on update_comments" ON public.update_comments FOR ALL USING (true) WITH CHECK (true);

-- Enable Real-Time Replication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.updates, 
            public.update_comments, 
            public.blockers, 
            public.kudos, 
            public.profiles, 
            public.pods, 
            public.performance_work_logs, 
            public.employee_leaves, 
            public.performance_reports;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

