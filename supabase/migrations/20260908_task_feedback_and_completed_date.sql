-- ==============================================================================
-- MAPLEBOT: COMPREHENSIVE & IDEMPOTENT SUPABASE SQL MIGRATION
-- Migration: 20260908_task_feedback_and_completed_date.sql
-- Run this in Supabase SQL Editor:
--   1. Ensures public.performance_work_logs exists with all operational columns.
--   2. Adds feedback_comments (individual task member feedback).
--   3. Adds reviewer_comments (Pod Lead / Manager evaluation comments).
--   4. Preserves member completed_date as single source of truth.
--   5. Configures Row Level Security (RLS) and creates performance indexes.
-- ==============================================================================

-- 1. Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.performance_work_logs (
    id TEXT PRIMARY KEY DEFAULT ('pwl-' || gen_random_uuid()),
    organization_id TEXT DEFAULT 'org-default',
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    department_id TEXT,
    department TEXT DEFAULT 'General',
    pod_id TEXT,
    pod_name TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    submission_time TEXT DEFAULT '10:00 AM',
    checkin_time TEXT DEFAULT '10:00 AM',
    project TEXT,
    project_name TEXT,
    task TEXT NOT NULL,
    task_title TEXT,
    task_description TEXT,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_invested NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
    duration_hours NUMERIC(6, 2) DEFAULT 1.0,
    unit_count_completed INT NOT NULL DEFAULT 1,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    review_assigned_date DATE DEFAULT CURRENT_DATE,
    feedback_comments TEXT,
    reviewer_comments TEXT,
    comments TEXT,
    category TEXT DEFAULT 'Development',
    priority TEXT DEFAULT 'medium',
    expected_completion_date DATE,
    review_completed_date DATE,
    reviewer TEXT,
    reviewer_name TEXT,
    reviewer_id TEXT,
    error_count INT DEFAULT 0,
    errors INT DEFAULT 0,
    quality NUMERIC(3, 1) DEFAULT 4.0,
    tat TEXT,
    tat_days INT,
    efficiency TEXT DEFAULT '95%',
    workflow_status TEXT DEFAULT 'submitted',
    delivery_status TEXT DEFAULT 'pending',
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

-- 2. Safely add columns if the table already existed previously
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS feedback_comments TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS unit_count_completed INT DEFAULT 1;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS submission_time TEXT DEFAULT '10:00 AM';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '10:00 AM';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'submitted';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';

-- 3. Non-destructive backfill: preserve historical comments into feedback_comments
UPDATE public.performance_work_logs
SET feedback_comments = comments
WHERE feedback_comments IS NULL AND comments IS NOT NULL;

-- 4. Enable Row Level Security (RLS) & establish permissive access policy
ALTER TABLE public.performance_work_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on performance_work_logs" ON public.performance_work_logs;
CREATE POLICY "Allow all on performance_work_logs" ON public.performance_work_logs FOR ALL USING (true) WITH CHECK (true);

-- 5. Create performance query indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON public.performance_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_pod ON public.performance_work_logs(pod_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON public.performance_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_work_logs_completed_date ON public.performance_work_logs(completed_date);
CREATE INDEX IF NOT EXISTS idx_work_logs_workflow ON public.performance_work_logs(workflow_status);

-- 6. Compatibility view for work_performance_logs if needed
CREATE OR REPLACE VIEW public.work_performance_logs AS SELECT * FROM public.performance_work_logs;
