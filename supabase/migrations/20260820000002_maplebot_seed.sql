-- ==============================================================================
-- MapleBot: Seed Data Migration
-- Pre-populated Demo Organization: Maple Learning Solutions
-- ==============================================================================

-- 1. Create Organization
INSERT INTO public.organizations (id, name, slug, logo_url, timezone)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Maple Learning Solutions',
    'maple-learning-solutions',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=128&auto=format&fit=crop&q=80',
    'America/Toronto'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Create Pods (Departments)
INSERT INTO public.pods (id, organization_id, name, description, status) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Web & Sales', 'Front-end development, CRM systems, web platforms, and client conversions', 'active'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Marketing', 'Digital growth, content strategy, email campaigns, and brand awareness', 'active'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'eLearning', 'Instructional design, interactive courseware, SCORM packages, and LMS deployments', 'active'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'HR', 'Talent acquisition, internal culture, people operations, and employee enablement', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Profiles (Admin, Managers, Members)
-- Admin
INSERT INTO public.profiles (id, organization_id, full_name, email, role, pod_id, timezone, status, avatar_url) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Alexander Wright', 'alex.wright@maplelearning.com', 'admin', NULL, 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Pod Managers
INSERT INTO public.profiles (id, organization_id, full_name, email, role, pod_id, timezone, status, avatar_url) VALUES
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Renuka Patel', 'renuka.patel@maplelearning.com', 'manager', '10000000-0000-0000-0000-000000000001', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Marcus Brody', 'marcus.brody@maplelearning.com', 'manager', '10000000-0000-0000-0000-000000000002', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Elena Rostov', 'elena.rostov@maplelearning.com', 'manager', '10000000-0000-0000-0000-000000000003', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'David Kim', 'david.kim@maplelearning.com', 'manager', '10000000-0000-0000-0000-000000000004', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Link managers to pods
UPDATE public.pods SET manager_id = '20000000-0000-0000-0000-000000000002' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE public.pods SET manager_id = '20000000-0000-0000-0000-000000000003' WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE public.pods SET manager_id = '20000000-0000-0000-0000-000000000004' WHERE id = '10000000-0000-0000-0000-000000000003';
UPDATE public.pods SET manager_id = '20000000-0000-0000-0000-000000000005' WHERE id = '10000000-0000-0000-0000-000000000004';

-- Team Members
INSERT INTO public.profiles (id, organization_id, full_name, email, role, pod_id, manager_id, timezone, status, avatar_url) VALUES
-- Web & Sales Members
('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Raghavi Sundaram', 'raghavi.s@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Liam Zhao', 'liam.zhao@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Harshika Varma', 'harshika.v@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=128&auto=format&fit=crop&q=80'),

-- Marketing Members
('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Chloe Bennett', 'chloe.b@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Devon Hayes', 'devon.h@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=128&auto=format&fit=crop&q=80'),

-- eLearning Members
('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Susan Miller', 'susan.m@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Lucas Santana', 'lucas.s@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=128&auto=format&fit=crop&q=80'),
('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Priya Nambiar', 'priya.n@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1534751516642-a171edd25218?w=128&auto=format&fit=crop&q=80'),

-- HR Members
('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Ananya Roy', 'ananya.r@maplelearning.com', 'member', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', 'America/Toronto', 'active', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=128&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 4. Create Default Check-in
INSERT INTO public.checkins (id, organization_id, name, description, frequency, active, start_time, deadline_time, reminder_time, days, timezone, created_by)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Maple Daily Standup',
    'Daily asynchronous standup for progress alignment, goal tracking, and early blocker resolution.',
    'daily',
    true,
    '09:00:00',
    '11:00:00',
    '09:30:00',
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    'America/Toronto',
    '20000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Checkin Questions
INSERT INTO public.checkin_questions (checkin_id, question, question_type, required, sort_order) VALUES
('30000000-0000-0000-0000-000000000001', 'What did you complete yesterday?', 'text', true, 1),
('30000000-0000-0000-0000-000000000001', 'What are you working on today?', 'text', true, 2),
('30000000-0000-0000-0000-000000000001', 'Do you have any blockers?', 'boolean', true, 3),
('30000000-0000-0000-0000-000000000001', 'What support do you need?', 'text', false, 4),
('30000000-0000-0000-0000-000000000001', 'Overall Status (On Track / At Risk / Blocked)', 'select', true, 5),
('30000000-0000-0000-0000-000000000001', 'Progress % (0 - 100)', 'slider', false, 6)
ON CONFLICT DO NOTHING;

-- 5. Create Active Sprint
INSERT INTO public.sprints (id, organization_id, name, description, start_date, end_date, status, created_by)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Sprint 56 — LMS Expansion & Q3 Pipeline',
    'Scale course authoring templates, deploy client portals, and optimize inbound sales onboarding funnels.',
    CURRENT_DATE - INTERVAL '6 days',
    CURRENT_DATE + INTERVAL '8 days',
    'active',
    '20000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 6. Google Chat Settings Initial Configuration
INSERT INTO public.google_chat_settings (organization_id, enabled, space_id, space_name, webhook_url, report_time, daily_reports, weekly_reports, sprint_reports, blocker_alerts, kudos_alerts)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    true,
    'spaces/AAAA_maple_team_updates',
    'Maple Team Updates',
    'https://chat.googleapis.com/v1/spaces/AAAA_maple_team_updates/messages?key=AIzaSyDEMO_KEY&token=DEMO_TOKEN',
    '10:30:00',
    true,
    true,
    true,
    true,
    true
) ON CONFLICT (organization_id) DO NOTHING;

-- 7. Sample Updates (Today & Past Days)
INSERT INTO public.updates (organization_id, checkin_id, profile_id, pod_id, update_date, yesterday, today, blocker, has_blocker, blocker_category, support_needed, status, priority, progress_percent, submitted_at) VALUES
-- Raghavi (Web & Sales) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, 
'Finalized the interactive pricing calculator on the main landing page and tested responsive breakpoints on iOS safari.',
'Refactoring the enterprise quote request API endpoint and linking with HubSpot CRM webhooks.',
'Awaiting sandbox API keys from the client CRM administrator.',
true, 'Access', 'Need Renuka to ping client IT contact to expedite API credentials.', 'at_risk', 'high', 80, NOW() - INTERVAL '1 hour 20 minutes'),

-- Liam Zhao (Web & Sales) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', CURRENT_DATE,
'Optimized Next.js bundle sizes and configured Edge caching for static course assets.',
'Building the customized customer checkout and Stripe subscription lifecycle handlers.',
NULL, false, NULL, NULL, 'on_track', 'medium', 90, NOW() - INTERVAL '2 hours'),

-- Harshika (Web & Sales) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', CURRENT_DATE,
'Prepared 12 enterprise demo pitch decks and scheduled 4 executive product demos for Thursday.',
'Executing lead qualification calls for the Midwest university consortium pipeline.',
NULL, false, NULL, NULL, 'on_track', 'medium', 75, NOW() - INTERVAL '45 minutes'),

-- Chloe Bennett (Marketing) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', CURRENT_DATE,
'Launched the Q3 LinkedIn Thought Leadership campaign focusing on AI in corporate microlearning.',
'Analyzing first-day engagement metrics and drafting the monthly newsletter blast.',
NULL, false, NULL, NULL, 'on_track', 'low', 85, NOW() - INTERVAL '3 hours'),

-- Susan Miller (eLearning) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', CURRENT_DATE,
'Authored modules 4 and 5 for the Healthcare Compliance SCORM 2004 interactive courseware.',
'Recording voiceover sync and building interactive quiz branching logic in Storyline 360.',
'Client review feedback has been delayed by 3 days, stalling the final QA sign-off.',
true, 'Client', 'Need Elena to escalate to client project sponsor regarding deadline impact.', 'blocked', 'high', 60, NOW() - INTERVAL '30 minutes'),

-- Lucas Santana (eLearning) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', CURRENT_DATE,
'Tested SCORM package cross-compatibility on Moodle, Canvas, and Cornerstone LMS platforms.',
'Packaging 8 localized course bundles for French Canadian learners.',
NULL, false, NULL, NULL, 'on_track', 'medium', 70, NOW() - INTERVAL '1 hour 45 minutes'),

-- Ananya Roy (HR) - Today
('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000004', CURRENT_DATE,
'Conducted 3 second-round interviews for Senior Instructional Designer position.',
'Finalizing offer letter for the new Web Developer candidate and scheduling onboarding sessions.',
NULL, false, NULL, NULL, 'on_track', 'low', 95, NOW() - INTERVAL '2 hours 15 minutes')
ON CONFLICT (profile_id, checkin_id, update_date) DO NOTHING;

-- 8. Sample Tracked Blockers
INSERT INTO public.blockers (id, organization_id, reported_by, pod_id, title, description, category, severity, status, assigned_to, created_at) VALUES
('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
'HubSpot CRM Sandbox API Keys Delayed',
'Cannot complete enterprise quote request endpoint integration without active OAuth client keys from the client IT team.',
'Access', 'high', 'in_progress', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day 4 hours'),

('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003',
'Healthcare Compliance Module 4 Client Sign-off Overdue',
'Client team has not provided written feedback on Module 4 storyboards, blocking final audio and video production phase.',
'Client', 'critical', 'open', '20000000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days 1 hour'),

('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001',
'Stripe Webhook TLS Handshake Error in Staging',
'Staging cloud firewall was dropping inbound Stripe test webhooks. Resolved with infrastructure certificate update.',
'Dependency', 'medium', 'resolved', '20000000-0000-0000-0000-000000000007', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- 9. Sample Kudos
INSERT INTO public.kudos (organization_id, sender_id, recipient_id, pod_id, category, message, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Ownership', 'Incredible work stepping in to debug the client pricing calculator ahead of the major university pitch!', NOW() - INTERVAL '3 hours'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Helping Others', 'Huge thanks for pairing with me on the GraphQL cache invalidation logic yesterday.', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', 'Innovation', 'The new interactive branching scenario Lucas created boosted learner quiz completion rates by 34%!', NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'Customer Focus', 'Exceptional turnaround time answering client RFPs and securing 3 enterprise presentations.', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- 10. Sample Notifications
INSERT INTO public.notifications (organization_id, profile_id, type, title, message, read, metadata, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'kudos_received', 'You received Kudos!', 'Renuka Patel gave you Kudos for Ownership: "Incredible work stepping in to debug the client pricing calculator..."', false, '{"category": "Ownership"}'::jsonb, NOW() - INTERVAL '3 hours'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'blocker_assigned', 'Blocker Assigned', 'You were assigned to follow up on blocker: "HubSpot CRM Sandbox API Keys Delayed"', false, '{"blocker_id": "50000000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'daily_report', 'Daily Team Report Ready', 'Maple Learning Solutions reached 86% standup completion today with 2 active blockers.', true, '{"participation": 86}'::jsonb, NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;
