-- ==============================================================================
-- MAPLEBOT: SAFE NON-DESTRUCTIVE PRODUCTION MIGRATION
-- Compatible with live Supabase databases (ZERO DROP / ZERO TRUNCATE)
-- ==============================================================================

-- 1. Ensure required PostgreSQL extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure Core Tables exist safely
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT 'org-maple-01',
    name TEXT NOT NULL DEFAULT 'Maple Learning Solutions',
    slug TEXT NOT NULL DEFAULT 'maple-learning-solutions',
    timezone TEXT DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pods (
    id TEXT PRIMARY KEY DEFAULT ('pod-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT,
    status TEXT DEFAULT 'active',
    members_count INT DEFAULT 0,
    participation_rate INT DEFAULT 100,
    active_blockers_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY DEFAULT ('prof-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member',
    pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL,
    pod_ids TEXT[],
    manager_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    timezone TEXT DEFAULT 'America/Toronto',
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure All Columns Exist on performance_work_logs (Non-Destructive ALTER)
CREATE TABLE IF NOT EXISTS public.performance_work_logs (
    id TEXT PRIMARY KEY DEFAULT ('pwl-' || substr(md5(random()::text), 1, 10)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_name TEXT NOT NULL DEFAULT 'General',
    task TEXT NOT NULL DEFAULT 'Task',
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_invested NUMERIC(6,2) NOT NULL DEFAULT 1.0,
    unit_count_completed INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS pod_name TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS submission_time TEXT DEFAULT '10:00 AM';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '10:00 AM';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS project TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS task_title TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS task_description TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(6,2) DEFAULT 1.0;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS review_assigned_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Development';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS deliverable TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS impact TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS review_completed_date DATE;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS reviewer TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS reviewer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS errors INT DEFAULT 0;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS quality NUMERIC(3,1) DEFAULT 4.0;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS tat TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS tat_days INT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS efficiency TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'submitted';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS delay_days INT DEFAULT 0;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS review_tat_days INT DEFAULT 0;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS pod_lead_reviewed_by TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS pod_lead_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS manager_reviewed_by TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS source_update_id TEXT;
ALTER TABLE public.performance_work_logs ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;

-- Populate missing project/task aliases from existing columns if NULL
UPDATE public.performance_work_logs SET project = project_name WHERE project IS NULL AND project_name IS NOT NULL;
UPDATE public.performance_work_logs SET project_name = project WHERE project_name IS NULL AND project IS NOT NULL;
UPDATE public.performance_work_logs SET task_title = task WHERE task_title IS NULL AND task IS NOT NULL;
UPDATE public.performance_work_logs SET task = task_title WHERE task IS NULL AND task_title IS NOT NULL;

-- 4. Ensure employee_leaves table exists safely
CREATE TABLE IF NOT EXISTS public.employee_leaves (
    id TEXT PRIMARY KEY DEFAULT ('leave-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    pod_id TEXT REFERENCES public.pods(id) ON DELETE SET NULL,
    pod_name TEXT,
    leave_type TEXT NOT NULL DEFAULT 'Paid Time Off (PTO)',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT CURRENT_DATE,
    days_count INT NOT NULL DEFAULT 1,
    quarter TEXT NOT NULL DEFAULT 'Q3',
    half_year TEXT NOT NULL DEFAULT 'H2',
    year INT NOT NULL DEFAULT 2026,
    reason TEXT NOT NULL DEFAULT 'Personal leave',
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS pod_name TEXT;

-- 5. NEW: INDIVIDUAL LEAVE BALANCES TABLE (DYNAMIC 12-DAY ENTITLEMENT)
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id TEXT PRIMARY KEY DEFAULT ('lbal-' || substr(md5(random()::text), 1, 8)),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INT NOT NULL DEFAULT 2026,
    total_quota INT NOT NULL DEFAULT 12,
    approved_taken INT NOT NULL DEFAULT 0,
    available_balance INT NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_year UNIQUE (user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON public.leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON public.leave_balances(year);

-- Safe initial population of leave_balances for all existing profiles in database (Preserves existing data)
INSERT INTO public.leave_balances (id, user_id, year, total_quota, approved_taken, available_balance)
SELECT 
    'lbal-' || substr(md5(p.id || '-2026'), 1, 8),
    p.id,
    2026,
    12,
    COALESCE(
        (SELECT SUM(l.days_count) 
         FROM public.employee_leaves l 
         WHERE l.employee_id = p.id AND l.year = 2026 AND l.status = 'approved'),
        0
    ),
    GREATEST(0, 12 - COALESCE(
        (SELECT SUM(l.days_count) 
         FROM public.employee_leaves l 
         WHERE l.employee_id = p.id AND l.year = 2026 AND l.status = 'approved'),
        0
    ))
FROM public.profiles p
WHERE p.status = 'active'
ON CONFLICT (user_id, year) DO NOTHING;

-- 6. Ensure Notifications Table Exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01' REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Ensure Indexes for Performance & Queries
CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON public.performance_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_pod ON public.performance_work_logs(pod_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON public.performance_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_work_logs_workflow ON public.performance_work_logs(workflow_status);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON public.employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.employee_leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.employee_leaves(status);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id, read);

-- 8. Enable Row Level Security (RLS) Permissive Policies
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on leave_balances" ON public.leave_balances;
CREATE POLICY "Allow all on leave_balances" ON public.leave_balances FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.performance_work_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on performance_work_logs" ON public.performance_work_logs;
CREATE POLICY "Allow all on performance_work_logs" ON public.performance_work_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employee_leaves" ON public.employee_leaves;
CREATE POLICY "Allow all on employee_leaves" ON public.employee_leaves FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notifications" ON public.notifications;
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 9. Real-Time Publication Setup
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.performance_work_logs, 
            public.employee_leaves, 
            public.leave_balances,
            public.notifications,
            public.profiles, 
            public.pods;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;
