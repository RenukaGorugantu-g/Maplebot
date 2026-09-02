-- ==============================================================================
-- MapleBot: Executive Performance Reporting & Work Analytics Migration
-- Non-destructive additive tables and indexes
-- ==============================================================================

-- 1. Performance Work Logs Table (Atomic Structured Work Activities)
CREATE TABLE IF NOT EXISTS public.performance_work_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    department_id TEXT,
    department TEXT NOT NULL,
    project TEXT NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    category TEXT NOT NULL DEFAULT 'Development',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_hours NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'in_progress', 'pending', 'blocked'
    priority TEXT NOT NULL DEFAULT 'medium',   -- 'low', 'medium', 'high', 'critical'
    deliverable TEXT,
    outcome TEXT,
    impact TEXT,
    reviewer_id TEXT,
    reviewer_name TEXT,
    source_update_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance_work_logs
CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON public.performance_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_dept ON public.performance_work_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_project ON public.performance_work_logs(project);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON public.performance_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_work_logs_status ON public.performance_work_logs(status);

-- 2. Performance KPIs Table (Targets, Measurements & Tracking)
CREATE TABLE IF NOT EXISTS public.performance_kpis (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    pod_id TEXT,
    employee_id TEXT,
    kra TEXT NOT NULL,
    kpi TEXT NOT NULL,
    target_value NUMERIC(10,2),
    target_unit TEXT DEFAULT '%',
    actual_value NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'not_measured', -- 'exceeded', 'met', 'near_target', 'needs_attention', 'not_measured'
    measurement TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',  -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpis_org ON public.performance_kpis(organization_id);
CREATE INDEX IF NOT EXISTS idx_kpis_pod ON public.performance_kpis(pod_id);
CREATE INDEX IF NOT EXISTS idx_kpis_employee ON public.performance_kpis(employee_id);

-- 3. Performance Reports Table (Archived Executive Reports & Manager Reviews)
CREATE TABLE IF NOT EXISTS public.performance_reports (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT,
    employee_name TEXT NOT NULL,
    pod_id TEXT,
    pod_name TEXT,
    report_type TEXT NOT NULL, -- 'individual', 'team', 'monthly', 'quarterly', 'kra_kpi', 'project'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_label TEXT NOT NULL,
    report_data JSONB NOT NULL,
    performance_score NUMERIC(5,2),
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'reviewed', 'approved'
    manager_rating NUMERIC(3,1),
    manager_comments TEXT,
    key_strengths TEXT,
    development_areas TEXT,
    next_period_objectives TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_employee ON public.performance_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_reports_pod ON public.performance_reports(pod_id);
CREATE INDEX IF NOT EXISTS idx_reports_period ON public.performance_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.performance_reports(status);

-- Enable Row Level Security (RLS) policies (Optional / permissive for anon/authenticated in demo)
ALTER TABLE public.performance_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'performance_work_logs' AND policyname = 'Allow public read and write') THEN
        CREATE POLICY "Allow public read and write" ON public.performance_work_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'performance_kpis' AND policyname = 'Allow public read and write') THEN
        CREATE POLICY "Allow public read and write" ON public.performance_kpis FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'performance_reports' AND policyname = 'Allow public read and write') THEN
        CREATE POLICY "Allow public read and write" ON public.performance_reports FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
