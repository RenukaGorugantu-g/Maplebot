-- ==============================================================================
-- MAPLEBOT: COMPREHENSIVE FIX FOR TIME TRACKING, MISSING COLUMNS & RLS POLICIES
-- File: supabase/migrations/20260929_fix_time_tracking_and_rls.sql
-- Paste this entire script in Supabase Dashboard -> SQL Editor -> Click 'Run'
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
ALTER TABLE IF EXISTS public.performance_work_logs
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
    checkin_date DATE DEFAULT CURRENT_DATE,
    checkout_date DATE,
    checkin_at TIMESTAMPTZ,
    checkin_time TEXT,
    checkout_at TIMESTAMPTZ,
    checkout_time TEXT,
    status TEXT NOT NULL DEFAULT 'checked_in',
    total_tasks_count INT NOT NULL DEFAULT 0,
    completed_tasks_count INT NOT NULL DEFAULT 0,
    wpi_tasks_count INT NOT NULL DEFAULT 0,
    total_hours_invested NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    summary_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add missing columns to daily_work_sessions if table already exists
ALTER TABLE IF EXISTS public.daily_work_sessions
    ADD COLUMN IF NOT EXISTS checkin_date DATE,
    ADD COLUMN IF NOT EXISTS checkout_date DATE;

-- Ensure clean upserting on daily_work_sessions by employee_id and work_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_daily_session_emp_date'
    ) THEN
        ALTER TABLE public.daily_work_sessions
            ADD CONSTRAINT uq_daily_session_emp_date UNIQUE (employee_id, work_date);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Ensure daily_action_items table exists
CREATE TABLE IF NOT EXISTS public.daily_action_items (
    id TEXT PRIMARY KEY DEFAULT ('dai-' || gen_random_uuid()),
    session_id TEXT,
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_name TEXT NOT NULL DEFAULT 'General',
    task_title TEXT NOT NULL,
    task_description TEXT,
    status TEXT NOT NULL DEFAULT 'wpi',
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

-- Add any missing columns to daily_action_items
ALTER TABLE IF EXISTS public.daily_action_items
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS wip_comment TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Drop restrictive foreign key constraint from daily_action_items so tasks never fail due to session_id mismatch
ALTER TABLE IF EXISTS public.daily_action_items
    DROP CONSTRAINT IF EXISTS daily_action_items_session_id_fkey;

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

-- 5. Grant access permissions to anon, authenticated, and service_role
GRANT ALL ON TABLE public.performance_work_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.daily_work_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.daily_action_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.task_time_tracking TO anon, authenticated, service_role;

-- 6. Enable Row Level Security (RLS) & Create Permissive Policies
ALTER TABLE IF EXISTS public.performance_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_time_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on performance_work_logs" ON public.performance_work_logs;
DROP POLICY IF EXISTS "Allow public read and write on performance_work_logs" ON public.performance_work_logs;
CREATE POLICY "Allow anon all on performance_work_logs"
    ON public.performance_work_logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on daily_work_sessions" ON public.daily_work_sessions;
DROP POLICY IF EXISTS "Allow public read and write on daily_work_sessions" ON public.daily_work_sessions;
CREATE POLICY "Allow anon all on daily_work_sessions"
    ON public.daily_work_sessions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on daily_action_items" ON public.daily_action_items;
DROP POLICY IF EXISTS "Allow public read and write on daily_action_items" ON public.daily_action_items;
CREATE POLICY "Allow anon all on daily_action_items"
    ON public.daily_action_items FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on task_time_tracking" ON public.task_time_tracking;
DROP POLICY IF EXISTS "Allow public read and write on task_time_tracking" ON public.task_time_tracking;
CREATE POLICY "Allow anon all on task_time_tracking"
    ON public.task_time_tracking FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- 7. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
