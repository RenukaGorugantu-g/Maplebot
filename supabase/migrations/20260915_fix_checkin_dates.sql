-- ==============================================================================
-- MAPLEBOT: COMPREHENSIVE SUPABASE SQL MIGRATION
-- Migration: 20260915_fix_checkin_dates.sql
-- Description:
--   1. Adds work_date and checkin_date columns to performance_work_logs.
--   2. Fixes all historical rows where date was stored as previous working day.
--      date and checkin_date are updated to the true check-in date from submitted_at.
--      work_date preserves the date the work was completed.
-- ==============================================================================

-- 1. Add work_date and checkin_date columns
ALTER TABLE public.performance_work_logs 
ADD COLUMN IF NOT EXISTS work_date DATE;

ALTER TABLE public.performance_work_logs 
ADD COLUMN IF NOT EXISTS checkin_date DATE;

-- 2. Backfill work_date with the reported completion/assignment date
UPDATE public.performance_work_logs
SET work_date = COALESCE(completed_date, assigned_date, date)
WHERE work_date IS NULL;

-- 3. Fix checkin dates for all historical rows based on the actual submission timestamp (Asia/Kolkata IST)
UPDATE public.performance_work_logs
SET 
  date = (submitted_at AT TIME ZONE 'Asia/Kolkata')::date,
  checkin_date = (submitted_at AT TIME ZONE 'Asia/Kolkata')::date
WHERE submitted_at IS NOT NULL;

-- 4. Create performance indexes for fast date queries
CREATE INDEX IF NOT EXISTS idx_pwl_checkin_date ON public.performance_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_pwl_work_date ON public.performance_work_logs(work_date);
