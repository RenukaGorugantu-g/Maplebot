-- ==============================================================================
-- MapleBot: Safe Cleanup Script for Sample / Testing Data in Supabase
-- ==============================================================================

-- 1. Clean up sample performance work logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_work_logs') THEN
        DELETE FROM public.performance_work_logs
        WHERE id LIKE 'pwl-seed-%'
           OR id LIKE 'pwl-sample-%'
           OR id LIKE 'pwl-lead-seed%'
           OR project_name ILIKE '%LXD Marketplace%'
           OR task ILIKE '%Meta tag optimizations%'
           OR task ILIKE '%SCORM 2004 compliance%';
    END IF;
END $$;

-- 2. Clean up sample employee leaves
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_leaves') THEN
        DELETE FROM public.employee_leaves
        WHERE id LIKE 'leave-seed-%'
           OR id LIKE 'leave-sample-%'
           OR reason ILIKE '%Sample test leave%'
           OR reason ILIKE '%Demo leave%';
    END IF;
END $$;

-- 3. Clean up sample updates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'updates') THEN
        DELETE FROM public.updates
        WHERE id LIKE '30000000-%'
           OR id LIKE 'upd-seed-%'
           OR id LIKE 'upd-sample-%'
           OR yesterday ILIKE '%pricing calculator%'
           OR yesterday ILIKE '%Healthcare Compliance SCORM%'
           OR yesterday ILIKE '%Next.js bundle sizes%'
           OR yesterday ILIKE '%enterprise demo pitch decks%'
           OR yesterday ILIKE '%LinkedIn Thought Leadership%';
    END IF;
END $$;

-- 4. Clean up sample blockers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blockers') THEN
        DELETE FROM public.blockers
        WHERE id LIKE 'blk-seed-%'
           OR id LIKE 'blk-sample-%'
           OR description ILIKE '%sandbox API keys%'
           OR title ILIKE '%sandbox API keys%';
    END IF;
END $$;

-- 5. Clean up sample comments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'update_comments') THEN
        DELETE FROM public.update_comments
        WHERE comment ILIKE '%Great job on%'
           OR comment ILIKE '%Please expedite%';
    END IF;
END $$;

-- 6. Clean up sample notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        DELETE FROM public.notifications
        WHERE id = 'notif-1'
           OR title ILIKE '%Daily Standup Reminder%';
    END IF;
END $$;

