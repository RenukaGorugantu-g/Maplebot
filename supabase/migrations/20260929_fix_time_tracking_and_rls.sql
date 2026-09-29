-- ==============================================================================
-- MAPLEBOT: COMPREHENSIVE FIX FOR TIME TRACKING, MISSING COLUMNS & RLS POLICIES
-- File: supabase/migrations/20260929_fix_time_tracking_and_rls.sql
-- Run this in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- ==============================================================================

-- 1. Ensure performance_work_logs has all time tracking and workflow columns
CREATE TABLE IF NOT EXISTS public.performance_work_logs (
    id TEXT PRIMARY KEY DEFAULT ('pwl-' || gen_random_uuid()),
    organization_id TEXT DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    department_id TEXT,
    department TEXT DEFAULT 'General',
    pod_id TEXT,
    pod_name TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    submission_time TEXT DEFAULT '10:00 AM',
    checkin_time TEXT DEFAULT '10:00 AM',
    checkout_time TEXT,
    checkout_at TIMESTAMPTZ,
    project TEXT DEFAULT 'General',
    project_name TEXT DEFAULT 'General',
    task TEXT NOT NULL,
    task_title TEXT,
    task_description TEXT,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_date DATE DEFAULT CURRENT_DATE,
    review_assigned_date DATE DEFAULT CURRENT_DATE,
    expected_completion_date DATE,
    review_completed_date DATE,
    time_invested NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    duration_hours NUMERIC(6, 2) DEFAULT 0.0,
    estimated_time_minutes INTEGER,
    actual_time_minutes INTEGER,
    unit_count_completed INT NOT NULL DEFAULT 1,
    feedback_comments TEXT,
    reviewer_comments TEXT,
    comments TEXT,
    wip_comment TEXT,
    wpi_reason TEXT,
    category TEXT DEFAULT 'Development',
    priority TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'wpi',
    workflow_status TEXT DEFAULT 'submitted',
    delivery_status TEXT DEFAULT 'pending',
    is_carried_forward BOOLEAN DEFAULT FALSE,
    carried_from_date DATE,
    status_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to performance_work_logs safely
ALTER TABLE public.performance_work_logs
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS wip_comment TEXT,
    ADD COLUMN IF NOT EXISTS wpi_reason TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checkout_time TEXT,
    ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_carried_forward BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS carried_from_date DATE,
    ADD COLUMN IF NOT EXISTS feedback_comments TEXT,
    ADD COLUMN IF NOT EXISTS reviewer_comments TEXT,
    ADD COLUMN IF NOT EXISTS submission_time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'General';

-- 2. Ensure daily_work_sessions table exists
CREATE TABLE IF NOT EXISTS public.daily_work_sessions (
    id TEXT PRIMARY KEY DEFAULT ('dws-' || gen_random_uuid()),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    pod_id TEXT,
    pod_name TEXT,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checkin_at TIMESTAMPTZ,
    checkin_time TEXT,
    checkout_at TIMESTAMPTZ,
    checkout_time TEXT,
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('draft', 'checked_in', 'checked_out')),
    total_tasks_count INT NOT NULL DEFAULT 0,
    completed_tasks_count INT NOT NULL DEFAULT 0,
    wpi_tasks_count INT NOT NULL DEFAULT 0,
    total_hours_invested NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    summary_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_work_date UNIQUE (employee_id, work_date)
);

-- 3. Ensure daily_action_items table exists
CREATE TABLE IF NOT EXISTS public.daily_action_items (
    id TEXT PRIMARY KEY DEFAULT ('dai-' || gen_random_uuid()),
    session_id TEXT REFERENCES public.daily_work_sessions(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_name TEXT NOT NULL DEFAULT 'General',
    task_title TEXT NOT NULL,
    task_description TEXT,
    status TEXT NOT NULL DEFAULT 'wpi' CHECK (status IN ('wpi', 'completed')),
    is_carried_forward BOOLEAN NOT NULL DEFAULT FALSE,
    carried_from_date DATE,
    carried_from_item_id TEXT,
    carried_from_reason TEXT,
    wpi_reason TEXT,
    next_action TEXT,
    completion_comment TEXT,
    time_invested NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    estimated_time_minutes INTEGER,
    actual_time_minutes INTEGER,
    wip_comment TEXT,
    status_updated_at TIMESTAMPTZ,
    unit_count INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist in daily_action_items
ALTER TABLE public.daily_action_items
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS wip_comment TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- 4. Ensure task_time_tracking table exists
CREATE TABLE IF NOT EXISTS public.task_time_tracking (
    id TEXT PRIMARY KEY DEFAULT ('ttt-' || gen_random_uuid()),
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    estimated_time_minutes INTEGER,
    actual_time_minutes INTEGER,
    status TEXT,
    wip_comment TEXT,
    time_logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) & Grant Permissive Access
ALTER TABLE public.performance_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting or restrictive existing policies
DROP POLICY IF EXISTS "Allow public read and write on performance_work_logs" ON public.performance_work_logs;
DROP POLICY IF EXISTS "Allow public read and write on daily_work_sessions" ON public.daily_work_sessions;
DROP POLICY IF EXISTS "Allow public read and write on daily_action_items" ON public.daily_action_items;
DROP POLICY IF EXISTS "Allow public read and write on task_time_tracking" ON public.task_time_tracking;

-- Create fully permissive public policies
CREATE POLICY "Allow public read and write on performance_work_logs"
    ON public.performance_work_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write on daily_work_sessions"
    ON public.daily_work_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write on daily_action_items"
    ON public.daily_action_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write on task_time_tracking"
    ON public.task_time_tracking FOR ALL USING (true) WITH CHECK (true);

-- 6. Reload schema cache notice
NOTIFY pgrst, 'reload schema';
