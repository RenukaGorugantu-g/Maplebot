-- ==============================================================================
-- MapleBot: Production Database Schema Migration
-- Designed for Maple Learning Solutions
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    timezone TEXT DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. PODS TABLE (Departments / Sub-teams)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID, -- References profiles(id), resolved via foreign key after profiles exists
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE (Users & Roles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- REFERENCES auth.users(id) ON DELETE SET NULL
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    timezone TEXT DEFAULT 'America/Toronto',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'invited')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add manager_id foreign key to pods now that profiles table is created
ALTER TABLE public.pods 
    DROP CONSTRAINT IF EXISTS fk_pods_manager,
    ADD CONSTRAINT fk_pods_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 4. CHECKINS TABLE (Standup / Update configurations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Maple Daily Update',
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'sprint')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIME NOT NULL DEFAULT '09:00:00',
    deadline_time TIME NOT NULL DEFAULT '11:00:00',
    reminder_time TIME NOT NULL DEFAULT '09:30:00',
    days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timezone TEXT DEFAULT 'America/Toronto',
    pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE, -- NULL means organization-wide
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CHECKIN_QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkin_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'text' CHECK (question_type IN ('text', 'boolean', 'select', 'slider', 'number')),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. CHECKIN_ASSIGNMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(checkin_id, profile_id)
);

-- ------------------------------------------------------------------------------
-- 7. UPDATES TABLE (Daily Standup Submissions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
    update_date DATE NOT NULL DEFAULT CURRENT_DATE,
    yesterday TEXT NOT NULL,
    today TEXT NOT NULL,
    blocker TEXT,
    has_blocker BOOLEAN NOT NULL DEFAULT FALSE,
    blocker_category TEXT CHECK (blocker_category IN ('Task', 'Project', 'Client', 'Team', 'Access', 'Dependency', 'Other', NULL)),
    support_needed TEXT,
    status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_profile_checkin_date UNIQUE(profile_id, checkin_id, update_date)
);

-- ------------------------------------------------------------------------------
-- 8. BLOCKERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    update_id UUID REFERENCES public.updates(id) ON DELETE SET NULL,
    reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Task', 'Project', 'Client', 'Team', 'Access', 'Dependency', 'Other')),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. BLOCKER_COMMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocker_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.blockers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. KUDOS TABLE (Peer Recognition)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kudos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'Great Work' CHECK (category IN ('Teamwork', 'Ownership', 'Innovation', 'Customer Focus', 'Helping Others', 'Great Work')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. SPRINTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. SPRINT_MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sprint_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
    UNIQUE(sprint_id, profile_id)
);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. GOOGLE_CHAT_SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    space_id TEXT,
    space_name TEXT,
    webhook_url TEXT,
    report_time TIME DEFAULT '10:30:00',
    daily_reports BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_reports BOOLEAN NOT NULL DEFAULT TRUE,
    sprint_reports BOOLEAN NOT NULL DEFAULT TRUE,
    blocker_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    kudos_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 15. REPORT_RUNS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'sprint', 'custom')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ------------------------------------------------------------------------------
-- 16. AI_QUERIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    response JSONB NOT NULL,
    scope TEXT NOT NULL DEFAULT 'pod',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 17. AUDIT_LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_pods_org ON public.pods(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pod ON public.profiles(pod_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_updates_org ON public.updates(organization_id);
CREATE INDEX IF NOT EXISTS idx_updates_profile ON public.updates(profile_id);
CREATE INDEX IF NOT EXISTS idx_updates_pod ON public.updates(pod_id);
CREATE INDEX IF NOT EXISTS idx_updates_date ON public.updates(update_date);
CREATE INDEX IF NOT EXISTS idx_updates_has_blocker ON public.updates(has_blocker);
CREATE INDEX IF NOT EXISTS idx_updates_status ON public.updates(status);
CREATE INDEX IF NOT EXISTS idx_blockers_org ON public.blockers(organization_id);
CREATE INDEX IF NOT EXISTS idx_blockers_pod ON public.blockers(pod_id);
CREATE INDEX IF NOT EXISTS idx_blockers_status ON public.blockers(status);
CREATE INDEX IF NOT EXISTS idx_blockers_created_at ON public.blockers(created_at);
CREATE INDEX IF NOT EXISTS idx_kudos_org ON public.kudos(organization_id);
CREATE INDEX IF NOT EXISTS idx_kudos_recipient ON public.kudos(recipient_id);
CREATE INDEX IF NOT EXISTS idx_kudos_created_at ON public.kudos(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_sprints_org ON public.sprints(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocker_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_pod_id()
RETURNS UUID AS $$
    SELECT pod_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organization Policies
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id = public.get_current_org_id());

CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (id = public.get_current_org_id() AND public.get_current_role() = 'admin');

-- Pods Policies
CREATE POLICY "Users can view pods in their organization"
    ON public.pods FOR SELECT
    USING (organization_id = public.get_current_org_id());

CREATE POLICY "Admins can manage pods"
    ON public.pods FOR ALL
    USING (organization_id = public.get_current_org_id() AND public.get_current_role() = 'admin');

-- Profiles Policies
CREATE POLICY "Users can view profiles in their organization"
    ON public.profiles FOR SELECT
    USING (organization_id = public.get_current_org_id());

CREATE POLICY "Admins can manage all profiles in organization"
    ON public.profiles FOR ALL
    USING (organization_id = public.get_current_org_id() AND public.get_current_role() = 'admin');

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = public.get_current_profile_id());

-- Updates Policies
CREATE POLICY "Users can view updates in their organization"
    ON public.updates FOR SELECT
    USING (organization_id = public.get_current_org_id());

CREATE POLICY "Users can create their own updates"
    ON public.updates FOR INSERT
    WITH CHECK (
        organization_id = public.get_current_org_id() AND 
        profile_id = public.get_current_profile_id()
    );

CREATE POLICY "Users can update their own recent updates"
    ON public.updates FOR UPDATE
    USING (profile_id = public.get_current_profile_id());

-- Blockers Policies
CREATE POLICY "Users can view blockers in their organization"
    ON public.blockers FOR SELECT
    USING (organization_id = public.get_current_org_id());

CREATE POLICY "Users can report blockers"
    ON public.blockers FOR INSERT
    WITH CHECK (organization_id = public.get_current_org_id());

CREATE POLICY "Managers and admins can update blockers"
    ON public.blockers FOR UPDATE
    USING (
        organization_id = public.get_current_org_id() AND (
            public.get_current_role() IN ('admin', 'manager') OR 
            reported_by = public.get_current_profile_id() OR
            assigned_to = public.get_current_profile_id()
        )
    );

-- Kudos Policies
CREATE POLICY "Users can view kudos in their organization"
    ON public.kudos FOR SELECT
    USING (organization_id = public.get_current_org_id());

CREATE POLICY "Users can give kudos"
    ON public.kudos FOR INSERT
    WITH CHECK (
        organization_id = public.get_current_org_id() AND
        sender_id = public.get_current_profile_id()
    );

-- Notifications Policies
CREATE POLICY "Users can view and manage their own notifications"
    ON public.notifications FOR ALL
    USING (profile_id = public.get_current_profile_id());

-- Google Chat Settings Policies (Admin Only)
CREATE POLICY "Admins can view and edit google chat settings"
    ON public.google_chat_settings FOR ALL
    USING (organization_id = public.get_current_org_id() AND public.get_current_role() = 'admin');

-- Audit Logs Policies (Admin Only Read)
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (organization_id = public.get_current_org_id() AND public.get_current_role() = 'admin');

CREATE POLICY "System and users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (organization_id = public.get_current_org_id());
