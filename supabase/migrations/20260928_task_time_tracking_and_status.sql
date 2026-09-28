-- ==============================================================================
-- MAPLEBOT: COMPREHENSIVE WORKFLOW, TIME TRACKING & PERFORMANCE MIGRATION
-- File: supabase/migrations/20260928_task_time_tracking_and_status.sql
-- Description:
--   100% idempotent: Safely creates tables if they don't exist yet,
--   or adds missing columns if tables already exist.
--   Covers: performance_work_logs, daily_work_sessions, daily_action_items, task_time_tracking.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.performance_work_logs
-- ------------------------------------------------------------------------------
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
    project TEXT,
    project_name TEXT,
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
    reviewer TEXT,
    reviewer_name TEXT,
    reviewer_id TEXT,
    error_count INT DEFAULT 0,
    errors INT DEFAULT 0,
    quality NUMERIC(3, 1) DEFAULT 4.0,
    tat TEXT,
    tat_days INT,
    efficiency TEXT DEFAULT '95%',
    delay_days INT DEFAULT 0,
    review_tat_days INT DEFAULT 0,
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    pod_lead_reviewed_by TEXT,
    pod_lead_reviewed_at TIMESTAMPTZ,
    manager_reviewed_by TEXT,
    manager_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure newly added columns exist if table was already created
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
    ADD COLUMN IF NOT EXISTS completed_date DATE,
    ADD COLUMN IF NOT EXISTS unit_count_completed INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS submission_time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS project_name TEXT,
    ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'submitted',
    ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_pwl_employee ON public.performance_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_pwl_date ON public.performance_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_pwl_pod ON public.performance_work_logs(pod_id);
CREATE INDEX IF NOT EXISTS idx_pwl_status ON public.performance_work_logs(status);
CREATE INDEX IF NOT EXISTS idx_pwl_estimated_time ON public.performance_work_logs (estimated_time_minutes);
CREATE INDEX IF NOT EXISTS idx_pwl_actual_time ON public.performance_work_logs (actual_time_minutes);

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.daily_work_sessions
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_dws_emp_date ON public.daily_work_sessions (employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_dws_work_date ON public.daily_work_sessions (work_date);
CREATE INDEX IF NOT EXISTS idx_dws_pod ON public.daily_work_sessions (pod_id);
CREATE INDEX IF NOT EXISTS idx_dws_status ON public.daily_work_sessions (status);

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.daily_action_items
-- ------------------------------------------------------------------------------
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

-- Ensure newly added columns exist if table was already created
ALTER TABLE public.daily_action_items
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS wip_comment TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dai_emp_date ON public.daily_action_items (employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_dai_status ON public.daily_action_items (status);
CREATE INDEX IF NOT EXISTS idx_dai_carried ON public.daily_action_items (is_carried_forward);
CREATE INDEX IF NOT EXISTS idx_dai_estimated_time ON public.daily_action_items (estimated_time_minutes);
CREATE INDEX IF NOT EXISTS idx_dai_actual_time ON public.daily_action_items (actual_time_minutes);

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.task_time_tracking
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_time_tracking (
    id TEXT PRIMARY KEY DEFAULT ('ttt-' || gen_random_uuid()),
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    estimated_time_minutes INTEGER,
    actual_time_minutes INTEGER,
    status TEXT CHECK (status IS NULL OR status IN ('WIP', 'Completed', 'wpi', 'completed')),
    wip_comment TEXT,
    time_logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ttt_task_id ON public.task_time_tracking(task_id);
CREATE INDEX IF NOT EXISTS idx_ttt_user_id ON public.task_time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ttt_status ON public.task_time_tracking(status);

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) & Permissive Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.performance_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- performance_work_logs policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'performance_work_logs' AND policyname = 'Allow public read and write on performance_work_logs'
    ) THEN
        CREATE POLICY "Allow public read and write on performance_work_logs" 
            ON public.performance_work_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- daily_work_sessions policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_work_sessions' AND policyname = 'Allow public read and write on daily_work_sessions'
    ) THEN
        CREATE POLICY "Allow public read and write on daily_work_sessions" 
            ON public.daily_work_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- daily_action_items policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_action_items' AND policyname = 'Allow public read and write on daily_action_items'
    ) THEN
        CREATE POLICY "Allow public read and write on daily_action_items" 
            ON public.daily_action_items FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- task_time_tracking policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_time_tracking' AND policyname = 'Allow public read and write on task_time_tracking'
    ) THEN
        CREATE POLICY "Allow public read and write on task_time_tracking" 
            ON public.task_time_tracking FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. Compatibility View
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.work_performance_logs AS SELECT * FROM public.performance_work_logs;
