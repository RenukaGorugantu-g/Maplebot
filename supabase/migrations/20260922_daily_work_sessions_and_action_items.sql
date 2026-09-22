-- ==============================================================================
-- MAPLEBOT: COMPREHENSIVE SUPABASE SQL MIGRATION
-- Migration: 20260922_daily_work_sessions_and_action_items.sql
-- Description:
--   1. Creates public.daily_work_sessions (Daily attendance, login/logout, status).
--   2. Creates public.daily_action_items (Daily deliverables, WPI reasons, carry-forward).
--   3. Adds additive columns to public.performance_work_logs for backward compatibility.
--   4. Configures Row Level Security (RLS) policies and performance indexes.
-- ==============================================================================

-- 1. Daily Work Sessions Table (One official session per employee per working date)
CREATE TABLE IF NOT EXISTS public.daily_work_sessions (
    id TEXT PRIMARY KEY DEFAULT ('dws-' || gen_random_uuid()),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    pod_id TEXT,
    pod_name TEXT,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checkin_at TIMESTAMPTZ,
    checkin_time TEXT,                      -- Formatted display string e.g. "09:32 AM"
    checkout_at TIMESTAMPTZ,
    checkout_time TEXT,                     -- Formatted display string e.g. "06:41 PM"
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

-- 2. Daily Action Items Table (Granular daily deliverables with WPI carry-forward)
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
    wpi_reason TEXT,                       -- Mandatory when status is 'wpi' at end of day
    next_action TEXT,                      -- Next continuation plan
    completion_comment TEXT,               -- Optional completion notes
    time_invested NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    unit_count INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dai_emp_date ON public.daily_action_items (employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_dai_status ON public.daily_action_items (status);
CREATE INDEX IF NOT EXISTS idx_dai_carried ON public.daily_action_items (is_carried_forward);

-- 3. Additive columns on public.performance_work_logs for 100% backward compatibility
ALTER TABLE public.performance_work_logs 
    ADD COLUMN IF NOT EXISTS checkout_time TEXT,
    ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_carried_forward BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS carried_from_date DATE,
    ADD COLUMN IF NOT EXISTS wpi_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_pwl_checkout_time ON public.performance_work_logs (checkout_time);

-- 4. Enable Row Level Security (RLS) & Permissive Policies
ALTER TABLE public.daily_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_action_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_work_sessions' AND policyname = 'Allow public read and write on daily_work_sessions'
    ) THEN
        CREATE POLICY "Allow public read and write on daily_work_sessions" 
            ON public.daily_work_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_action_items' AND policyname = 'Allow public read and write on daily_action_items'
    ) THEN
        CREATE POLICY "Allow public read and write on daily_action_items" 
            ON public.daily_action_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
