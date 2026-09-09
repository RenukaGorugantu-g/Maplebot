-- ==============================================================================
-- MAPLEBOT: TASK FEEDBACK & STREAMLINED COMPLETED DATE MIGRATION
-- Migration: 20260908_task_feedback_and_completed_date.sql
-- Purpose:
--   1. Add individual task-level member feedback/comments column (feedback_comments).
--   2. Add reviewer comments column (reviewer_comments) for Pod Lead & Manager reviews.
--   3. Maintain comments column for backward compatibility.
--   4. Non-destructively populate feedback_comments from comments for historical rows.
-- ==============================================================================

-- 1. Add feedback_comments (Member Feedback / Comments on individual task)
ALTER TABLE public.performance_work_logs 
ADD COLUMN IF NOT EXISTS feedback_comments TEXT;

-- 2. Add reviewer_comments (Pod Lead / Manager Reviewer Comments)
ALTER TABLE public.performance_work_logs 
ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- 3. Non-destructive backfill: preserve historical comments into feedback_comments
UPDATE public.performance_work_logs
SET feedback_comments = comments
WHERE feedback_comments IS NULL AND comments IS NOT NULL;

-- 4. Ensure index exists on completed_date for fast querying
CREATE INDEX IF NOT EXISTS idx_work_logs_completed_date 
ON public.performance_work_logs(completed_date);
