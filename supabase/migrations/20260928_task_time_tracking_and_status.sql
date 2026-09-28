-- ==============================================================================
-- MAPLEBOT: TASK TIME TRACKING & WORKFLOW STATUS MIGRATION
-- Migration: 20260928_task_time_tracking_and_status.sql
-- Description:
--   1. Adds estimated_time_minutes, actual_time_minutes, wip_comment, and status_updated_at
--      to public.performance_work_logs and public.daily_action_items.
--   2. Adds performance indexes for time-tracking and status queries.
--   3. Creates public.task_time_tracking table for granular time logs.
-- ==============================================================================

-- 1. Add time tracking & status fields to performance_work_logs
ALTER TABLE public.performance_work_logs 
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS wip_comment TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pwl_estimated_time ON public.performance_work_logs (estimated_time_minutes);
CREATE INDEX IF NOT EXISTS idx_pwl_actual_time ON public.performance_work_logs (actual_time_minutes);
CREATE INDEX IF NOT EXISTS idx_pwl_status ON public.performance_work_logs (status);

-- 2. Add time tracking & status fields to daily_action_items
ALTER TABLE public.daily_action_items 
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS wip_comment TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dai_estimated_time ON public.daily_action_items (estimated_time_minutes);
CREATE INDEX IF NOT EXISTS idx_dai_actual_time ON public.daily_action_items (actual_time_minutes);

-- 3. Dedicated Task Time Tracking Table (Granular audit & target comparisons)
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

-- Enable RLS & Permissive Policy on task_time_tracking
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_time_tracking' AND policyname = 'Allow public read and write on task_time_tracking'
    ) THEN
        CREATE POLICY "Allow public read and write on task_time_tracking" 
            ON public.task_time_tracking FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
