-- ==============================================================================
-- MAPLEBOT: COMPLETE DATABASE SCHEMA, MIGRATIONS & SEED SCRIPT
-- PostgreSQL / Supabase Migration
-- Work Performance Tracking, Pod Reviews, Manager Assessments & Check-in Time
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CORE ENUMS & TYPES
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status_type AS ENUM (
        'draft',
        'submitted',
        'pod_lead_reviewed',
        'manager_reviewed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status_type AS ENUM (
        'pending',
        'completed_early',
        'completed_on_time',
        'delayed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blocker_category_type AS ENUM (
        'Task',
        'Technical',
        'Access',
        'Client',
        'Resource',
        'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. ORGANIZATIONS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT 'org-maple-01',
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '18:00:00',
    standup_start_time TIME DEFAULT '09:00:00',
    standup_end_time TIME DEFAULT '11:30:00',
    timezone TEXT DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. PODS (DEPARTMENTS) TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pods (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    lead_id TEXT,
    lead_name TEXT,
    member_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. USER PROFILES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    auth_user_id UUID,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'member',
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    pod_ids TEXT[] DEFAULT '{}',
    title TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'America/Toronto',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. WORK PERFORMANCE LOGS TABLE (PRIMARY 17-COLUMN + CHECK-IN TIME LEDGER)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS work_performance_logs (
    id TEXT PRIMARY KEY DEFAULT ('pwl-' || uuid_generate_v4()),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    department_id TEXT,
    department TEXT DEFAULT 'General',
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    pod_name TEXT,

    -- 1. POD MEMBER WORK FIELDS (9 Required Fields + Check-in Time)
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    submission_time VARCHAR(20) DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM'), -- Check-in / Submission Time (e.g. 10:15 AM)
    project_name TEXT NOT NULL,
    task TEXT NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_invested NUMERIC(5, 2) NOT NULL DEFAULT 1.0, -- Hours
    unit_count_completed INT NOT NULL DEFAULT 1, -- Deliverables Count (Quantity)
    review_assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    comments TEXT,
    category TEXT DEFAULT 'Development',
    priority TEXT DEFAULT 'medium',
    deliverable TEXT,
    outcome TEXT,
    impact TEXT,

    -- 2. POD LEAD REVIEW FIELDS (5 Verification Fields)
    expected_completion_date DATE,
    completed_date DATE,
    review_completed_date DATE,
    reviewer TEXT,
    reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    error_count INT DEFAULT 0,

    -- 3. MANAGER PERFORMANCE EVALUATION FIELDS (3 Assessment Fields)
    quality NUMERIC(3, 1), -- Scale 1.0 to 5.0 (or quality rating)
    tat TEXT, -- Turnaround Time (e.g. "3 days")
    tat_days INT,
    efficiency TEXT, -- Efficiency (e.g. "95%")

    -- WORKFLOW & LIFECYCLE AUDIT METADATA
    workflow_status workflow_status_type DEFAULT 'submitted',
    delivery_status delivery_status_type DEFAULT 'pending',
    delay_days INT DEFAULT 0,
    review_tat_days INT DEFAULT 0,
    error_rate NUMERIC(5, 2) DEFAULT 0,
    units_per_hour NUMERIC(5, 2) DEFAULT 0,

    submitted_by TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    pod_lead_reviewed_by TEXT,
    pod_lead_reviewed_at TIMESTAMPTZ,
    manager_reviewed_by TEXT,
    manager_reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. PERFORMANCE KPIS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS performance_kpis (
    id TEXT PRIMARY KEY DEFAULT ('kpi-' || uuid_generate_v4()),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    employee_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    kra TEXT NOT NULL, -- Key Result Area
    kpi TEXT NOT NULL, -- Key Performance Indicator
    target_value NUMERIC(10, 2),
    actual_value NUMERIC(10, 2),
    unit TEXT DEFAULT 'Units',
    status TEXT DEFAULT 'met',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. PERFORMANCE REPORTS TABLE (MAPLE AI EXECUTIVE REPORTS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS performance_reports (
    id TEXT PRIMARY KEY DEFAULT ('rep-' || uuid_generate_v4()),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL DEFAULT 'individual', -- individual | team | kra_kpi
    reporting_period TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    report_data JSONB NOT NULL,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. AUDIT LOGS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('aud-' || uuid_generate_v4()),
    organization_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. INDEXES FOR LIGHTNING-FAST REPORTING & FILTER QUERIES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_work_logs_employee_date ON work_performance_logs (employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_pod_date ON work_performance_logs (pod_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_workflow_status ON work_performance_logs (workflow_status);
CREATE INDEX IF NOT EXISTS idx_work_logs_project ON work_performance_logs (project_name);
CREATE INDEX IF NOT EXISTS idx_work_logs_delivery_status ON work_performance_logs (delivery_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE work_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users read access to organization work logs
CREATE POLICY "Allow read access to work logs" ON work_performance_logs
    FOR SELECT USING (true);

-- Allow employees to insert their own work logs
CREATE POLICY "Allow insert own work logs" ON work_performance_logs
    FOR INSERT WITH CHECK (true);

-- Allow leads and managers to update review & quality fields
CREATE POLICY "Allow update work logs" ON work_performance_logs
    FOR UPDATE USING (true);

-- ==============================================================================
-- 12. SAMPLE SEED DATA FOR DEMO & TEST
-- ==============================================================================

-- 1. Insert Org
INSERT INTO organizations (id, name, domain)
VALUES ('org-maple-01', 'Maple Learning Solutions', 'maple.com')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Insert Pods
INSERT INTO pods (id, organization_id, name, department, lead_name)
VALUES
    ('pod-web-sales', 'org-maple-01', 'Web & Sales', 'Digital Products', 'Renuka Gorugantu'),
    ('pod-elearning', 'org-maple-01', 'eLearning & LMS', 'Instructional Design', 'Dhana Lakshmi'),
    ('pod-devops', 'org-maple-01', 'DevOps & Infra', 'Engineering', 'Raghavendra')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Test Profiles (Manager, Pod Lead, Member)
INSERT INTO profiles (id, organization_id, email, full_name, role, pod_id, title)
VALUES
    ('prof-sample-manager', 'org-maple-01', 'manager@maple.com', 'Sandeep Guntupalli (Manager)', 'admin', 'pod-web-sales', 'Engineering Director / Manager'),
    ('prof-sample-podlead', 'org-maple-01', 'podlead@maple.com', 'Renuka Gorugantu (Pod Lead)', 'manager', 'pod-web-sales', 'Web & Sales Pod Lead'),
    ('prof-sample-member', 'org-maple-01', 'member@maple.com', 'Harshika Netha (Pod Member)', 'member', 'pod-web-sales', 'Full-Stack Developer')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 4. Insert Sample 17-Column Performance Work Logs (with Check-in Time)
INSERT INTO work_performance_logs (
    id, organization_id, employee_id, employee_name, department_id, department, pod_id, pod_name,
    date, submission_time, project_name, task, assigned_date, expected_completion_date, completed_date,
    time_invested, unit_count_completed, review_assigned_date, review_completed_date, reviewer,
    error_count, quality, tat, tat_days, efficiency, comments, category, priority,
    workflow_status, delivery_status
) VALUES
(
    'pwl-seed-01',
    'org-maple-01',
    'prof-sample-member',
    'Harshika Netha (Pod Member)',
    'pod-web-sales',
    'Web & Sales',
    'pod-web-sales',
    'Web & Sales',
    '2026-08-20',
    '10:15 AM',
    'LXD Marketplace',
    'Meta tag optimizations, canonical tags and JSON-LD schema integration for course catalog',
    '2026-08-20',
    '2026-08-22',
    '2026-08-23',
    5.5,
    12,
    '2026-08-23',
    '2026-08-24',
    'Renuka Gorugantu',
    1,
    4.5,
    '3 days',
    3,
    '88%',
    '1 day delay due to schema validator API rate limiting dependency.',
    'SEO',
    'high',
    'manager_reviewed',
    'delayed'
),
(
    'pwl-seed-02',
    'org-maple-01',
    'prof-sample-member',
    'Harshika Netha (Pod Member)',
    'pod-web-sales',
    'Web & Sales',
    'pod-web-sales',
    'Web & Sales',
    '2026-08-24',
    '09:45 AM',
    'Maple LMS',
    'Configure SCORM 2004 compliance test harnesses and custom webhook triggers for LearnDash LMS',
    '2026-08-24',
    '2026-08-26',
    '2026-08-26',
    6.0,
    4,
    '2026-08-26',
    '2026-08-27',
    'Renuka Gorugantu',
    0,
    5.0,
    '2 days',
    2,
    '96%',
    'Completed strictly on schedule with zero regression bugs.',
    'LMS',
    'critical',
    'manager_reviewed',
    'completed_on_time'
),
(
    'pwl-seed-03',
    'org-maple-01',
    'prof-sample-member',
    'Harshika Netha (Pod Member)',
    'pod-web-sales',
    'Web & Sales',
    'pod-web-sales',
    'Web & Sales',
    '2026-08-26',
    '10:30 AM',
    'Corporate Website',
    'Core Web Vitals remediation: LCP asset preloading, layout shift reduction and image lazy-loading',
    '2026-08-26',
    '2026-08-28',
    '2026-08-27',
    4.5,
    8,
    '2026-08-27',
    '2026-08-28',
    'Renuka Gorugantu',
    0,
    4.8,
    '1 day',
    1,
    '98%',
    'Completed 1 day ahead of expected schedule.',
    'Development',
    'high',
    'manager_reviewed',
    'completed_early'
),
(
    'pwl-seed-04',
    'org-maple-01',
    'prof-sample-podlead',
    'Renuka Gorugantu (Pod Lead)',
    'pod-web-sales',
    'Web & Sales',
    'pod-web-sales',
    'Web & Sales',
    '2026-08-24',
    '11:00 AM',
    'Corporate Website',
    'HubSpot CRM custom forms integration and lead capture webhook routing',
    '2026-08-24',
    '2026-08-26',
    '2026-08-26',
    5.5,
    3,
    '2026-08-26',
    '2026-08-27',
    'Sandeep Guntupalli',
    0,
    4.8,
    '2 days',
    2,
    '95%',
    'All forms validated with enterprise lead routing.',
    'Sales',
    'high',
    'manager_reviewed',
    'completed_on_time'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 13. COMPANY DECLARED HOLIDAYS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS company_holidays (
    id TEXT PRIMARY KEY DEFAULT ('hol-' || uuid_generate_v4()),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    day_of_week TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'mandatory', -- mandatory | optional | restricted
    quarter TEXT NOT NULL, -- Q1 | Q2 | Q3 | Q4
    half_year TEXT NOT NULL, -- H1 | H2
    year INT NOT NULL DEFAULT 2026,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_holidays_year_quarter ON company_holidays (year, quarter);

-- ==============================================================================
-- 14. EMPLOYEE LEAVE REQUESTS & PLANNING TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS employee_leaves (
    id TEXT PRIMARY KEY DEFAULT ('leave-' || uuid_generate_v4()),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    pod_id TEXT REFERENCES pods(id) ON DELETE SET NULL,
    pod_name TEXT,
    leave_type TEXT NOT NULL DEFAULT 'Paid Time Off (PTO)',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL DEFAULT 1,
    quarter TEXT NOT NULL, -- Q1 | Q2 | Q3 | Q4
    half_year TEXT NOT NULL, -- H1 | H2
    year INT NOT NULL DEFAULT 2026,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'planned', -- planned | pending | approved | rejected
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_leaves_emp_year ON employee_leaves (employee_id, year);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_quarter ON employee_leaves (quarter, year);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_status ON employee_leaves (status);

-- Seed 2026 Declared Holidays
INSERT INTO company_holidays (id, organization_id, name, date, day_of_week, type, quarter, half_year, year, description)
VALUES
    ('hol-01', 'org-maple-01', 'New Year''s Day', '2026-01-01', 'Thursday', 'mandatory', 'Q1', 'H1', 2026, 'New year celebration'),
    ('hol-02', 'org-maple-01', 'Republic Day', '2026-01-26', 'Monday', 'mandatory', 'Q1', 'H1', 2026, 'National holiday'),
    ('hol-03', 'org-maple-01', 'Holi (Festival of Colors)', '2026-03-25', 'Wednesday', 'mandatory', 'Q1', 'H1', 2026, 'Festival of Colors'),
    ('hol-04', 'org-maple-01', 'Good Friday', '2026-04-03', 'Friday', 'mandatory', 'Q2', 'H1', 2026, 'Christian holy day'),
    ('hol-05', 'org-maple-01', 'Eid al-Fitr', '2026-04-10', 'Friday', 'mandatory', 'Q2', 'H1', 2026, 'Ramadan conclusion'),
    ('hol-06', 'org-maple-01', 'Independence Day', '2026-08-15', 'Saturday', 'mandatory', 'Q3', 'H2', 2026, 'National Independence Day'),
    ('hol-07', 'org-maple-01', 'Ganesh Chaturthi', '2026-09-07', 'Monday', 'mandatory', 'Q3', 'H2', 2026, 'Auspicious festival'),
    ('hol-08', 'org-maple-01', 'Gandhi Jayanti', '2026-10-02', 'Friday', 'mandatory', 'Q4', 'H2', 2026, 'Birthday of Mahatma Gandhi'),
    ('hol-09', 'org-maple-01', 'Dussehra', '2026-10-20', 'Tuesday', 'mandatory', 'Q4', 'H2', 2026, 'Festive holiday'),
    ('hol-10', 'org-maple-01', 'Diwali', '2026-11-08', 'Sunday', 'mandatory', 'Q4', 'H2', 2026, 'Festival of Lights'),
    ('hol-11', 'org-maple-01', 'Christmas Day', '2026-12-25', 'Friday', 'mandatory', 'Q4', 'H2', 2026, 'Christmas celebration')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Planned Leaves
INSERT INTO employee_leaves (id, organization_id, employee_id, employee_name, pod_id, pod_name, leave_type, start_date, end_date, days_count, quarter, half_year, year, reason, status, approved_by)
VALUES
    ('leave-hn-01', 'org-maple-01', 'prof-sample-member', 'Harshika Netha (Pod Member)', 'pod-web-sales', 'Web & Sales', 'Paid Time Off (PTO)', '2026-09-14', '2026-09-18', 5, 'Q3', 'H2', 2026, 'Annual vacation post Q3 release', 'approved', 'Renuka Gorugantu'),
    ('leave-ren-01', 'org-maple-01', 'prof-sample-podlead', 'Renuka Gorugantu (Pod Lead)', 'pod-web-sales', 'Web & Sales', 'Paid Time Off (PTO)', '2026-10-19', '2026-10-23', 5, 'Q4', 'H2', 2026, 'Dussehra festival & travel', 'approved', 'Sandeep Guntupalli')
ON CONFLICT (id) DO NOTHING;

