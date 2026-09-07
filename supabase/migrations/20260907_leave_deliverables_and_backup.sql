-- ==============================================================================
-- MapleBot: Safe Migration for Leave Deliverables & Backup Handover Fields
-- Adds deliverables_status, deliverables_notes, backup_person, and backup_plan
-- ==============================================================================

-- 1. Ensure employee_leaves table exists
CREATE TABLE IF NOT EXISTS public.employee_leaves (
    id TEXT PRIMARY KEY DEFAULT ('leave-' || substr(md5(random()::text), 1, 8)),
    organization_id TEXT NOT NULL DEFAULT 'org-maple-01',
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    pod_id TEXT,
    pod_name TEXT,
    leave_type TEXT NOT NULL DEFAULT 'Paid Time Off (PTO)',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL DEFAULT 1,
    quarter TEXT NOT NULL DEFAULT 'Q3',
    half_year TEXT NOT NULL DEFAULT 'H2',
    year INT NOT NULL DEFAULT 2026,
    reason TEXT NOT NULL DEFAULT 'Planned leave',
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    deliverables_status TEXT DEFAULT 'Yes — All deliverables completed',
    deliverables_notes TEXT,
    backup_person TEXT,
    backup_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Safe Alter Table Add Columns
ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS deliverables_status TEXT DEFAULT 'Yes — All deliverables completed';
ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS deliverables_notes TEXT;
ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS backup_person TEXT;
ALTER TABLE public.employee_leaves ADD COLUMN IF NOT EXISTS backup_plan TEXT;

-- 3. Also check leave_requests table if used as alias
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
        ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS deliverables_status TEXT DEFAULT 'Yes — All deliverables completed';
        ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS deliverables_notes TEXT;
        ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS backup_person TEXT;
        ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS backup_plan TEXT;
    END IF;
END $$;
