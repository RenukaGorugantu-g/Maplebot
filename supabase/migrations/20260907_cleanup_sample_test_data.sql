-- ==============================================================================
-- MapleBot: Cleanup Script for Sample / Testing Data in Supabase
-- Safely removes testing demo records from updates, blockers, leaves, and work logs
-- ==============================================================================

-- 1. Clean up sample performance work logs (testing records)
DELETE FROM public.performance_work_logs
WHERE id LIKE 'pwl-seed-%'
   OR id LIKE 'pwl-sample-%'
   OR id LIKE 'pwl-lead-seed%'
   OR project_name ILIKE '%LXD Marketplace%'
   OR task ILIKE '%Meta tag optimizations%'
   OR task ILIKE '%SCORM 2004 compliance%';

-- 2. Clean up sample employee leaves / leave requests (testing records)
DELETE FROM public.employee_leaves
WHERE id LIKE 'leave-seed-%'
   OR id LIKE 'leave-sample-%'
   OR reason ILIKE '%Sample test leave%'
   OR reason ILIKE '%Demo leave%';

-- 3. Clean up sample updates (3-4 testing updates)
DELETE FROM public.updates
WHERE id LIKE '30000000-%'
   OR id LIKE 'upd-seed-%'
   OR id LIKE 'upd-sample-%'
   OR yesterday ILIKE '%pricing calculator%'
   OR yesterday ILIKE '%Healthcare Compliance SCORM%'
   OR yesterday ILIKE '%Next.js bundle sizes%'
   OR yesterday ILIKE '%enterprise demo pitch decks%'
   OR yesterday ILIKE '%LinkedIn Thought Leadership%';

-- 4. Clean up sample blockers
DELETE FROM public.blockers
WHERE id LIKE 'blk-seed-%'
   OR id LIKE 'blk-sample-%'
   OR description ILIKE '%sandbox API keys%'
   OR blocker ILIKE '%sandbox API keys%';

-- 5. Clean up sample comments
DELETE FROM public.update_comments
WHERE comment ILIKE '%Great job on%'
   OR comment ILIKE '%Please expedite%';

-- 6. Clean up sample notifications
DELETE FROM public.notifications
WHERE id = 'notif-1'
   OR title ILIKE '%Daily Standup Reminder%';
