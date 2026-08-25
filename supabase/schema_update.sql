-- ============================================================================
-- MAPLEBOT: SUPABASE CREDENTIALS, FORGOT PASSWORD & ROSTER SQL SCRIPT
-- Paste and execute this entire script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Create User Credentials Table (for cross-device corporate authentication & password changes)
CREATE TABLE IF NOT EXISTS user_credentials (
    id TEXT PRIMARY KEY DEFAULT ('cred-' || substr(md5(random()::text), 1, 8)),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Password Reset Requests Table
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY DEFAULT ('pr-' || substr(md5(random()::text), 1, 8)),
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configure Row Level Security (RLS)
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on user_credentials" ON user_credentials;
CREATE POLICY "Allow anon all on user_credentials" ON user_credentials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on password_resets" ON password_resets;
CREATE POLICY "Allow anon all on password_resets" ON password_resets FOR ALL USING (true) WITH CHECK (true);

-- 4. Lift Blocker Category Constraints so any category (like 'Task', 'External', 'Dependency') is saved
ALTER TABLE updates DROP CONSTRAINT IF EXISTS updates_blocker_category_check;
ALTER TABLE blockers DROP CONSTRAINT IF EXISTS blockers_category_check;

-- 5. Seed / Upsert Canonical Organization & Pods
INSERT INTO organizations (id, name, slug, timezone)
VALUES ('org-maple-01', 'Maple Learning Solutions', 'maple-learning-solutions', 'America/Toronto')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pods (id, organization_id, name, description, manager_id, status)
VALUES 
  ('pod-web-sales', 'org-maple-01', 'Web & Sales', 'Web development, client platforms, revenue initiatives, and sales conversion workflows.', 'prof-renuka', 'active'),
  ('pod-marketing', 'org-maple-01', 'Marketing', 'Brand awareness, digital growth, social outreach, and content campaigns.', 'prof-nithin', 'active'),
  ('pod-elearning', 'org-maple-01', 'eLearning', 'Interactive curriculum development, instructional design, and LMS courseware.', 'prof-dhana', 'active'),
  ('pod-hr', 'org-maple-01', 'HR Operations', 'Talent acquisition, employee experience, policy compliance, and internal operations.', 'prof-swetha', 'active')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  manager_id = EXCLUDED.manager_id,
  status = EXCLUDED.status;

-- 6. Seed / Upsert All Canonical Member Profiles
INSERT INTO profiles (id, organization_id, full_name, email, role, pod_id, status)
VALUES 
  ('prof-admin', 'org-maple-01', 'Maple Edge Admin', 'info@maplelearningsolutions.com', 'admin', NULL, 'active'),
  ('prof-sandeep', 'org-maple-01', 'Sandeep M', 'sandeep@maplelearningsolutions.com', 'admin', NULL, 'active'),
  ('prof-raj', 'org-maple-01', 'Raj Ayyanar', 'raj.ayyanar@maplelearningsolutions.com', 'admin', NULL, 'active'),
  ('prof-krishna', 'org-maple-01', 'Krishna Sunkara', 'krishna@maplelearningsolutions.com', 'admin', NULL, 'active'),
  ('prof-rathish', 'org-maple-01', 'Rathish Rajendran', 'rathish.rajendran@maplelearningsolutions.com', 'admin', NULL, 'active'),
  ('prof-renuka', 'org-maple-01', 'Renuka Gorugantu', 'renuka@maplelearningsolutions.com', 'manager', 'pod-web-sales', 'active'),
  ('prof-nithin', 'org-maple-01', 'Nithin Guggilla', 'nithin@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),
  ('prof-raghavi', 'org-maple-01', 'Raghavi Jammula', 'raghavi@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),
  ('prof-harshika', 'org-maple-01', 'Harshika Netha', 'harshika@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),
  ('prof-susan', 'org-maple-01', 'Susan Vijaya', 'susan@maplelearningsolutions.com', 'member', 'pod-web-sales', 'active'),
  ('prof-dhana', 'org-maple-01', 'Dhana Sekhar', 'dhana@maplelearningsolutions.com', 'manager', 'pod-elearning', 'active'),
  ('prof-christeena', 'org-maple-01', 'Christeena George', 'christeena@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-malavika', 'org-maple-01', 'Malavika Koraganti', 'malavika@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-pratap', 'org-maple-01', 'Pratap Rudra', 'pratap@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-navyasree', 'org-maple-01', 'Navyasree Nuthangi', 'navyasree@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-varsha', 'org-maple-01', 'Varsha chhanganiji', 'varsha@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-swathi', 'org-maple-01', 'Swathi Thoranala', 'swathi@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-bhanu', 'org-maple-01', 'Bhanu Reddy Shetty', 'bhanu.reddy@maplelearningsolutions.com', 'member', 'pod-elearning', 'active'),
  ('prof-swetha', 'org-maple-01', 'Swetha N', 'swetha@maplelearningsolutions.com', 'manager', 'pod-hr', 'active'),
  ('prof-abhishek', 'org-maple-01', 'Abhishek Guna', 'abhishek@maplelearningsolutions.com', 'member', 'pod-hr', 'active')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  pod_id = EXCLUDED.pod_id,
  status = EXCLUDED.status;

-- 7. Clean up typo duplicate profiles & reassign updates
UPDATE profiles SET full_name = 'Pratap Rudra', pod_id = 'pod-elearning', status = 'active' WHERE id = 'user-1787630983073' OR email LIKE 'pratap@%';
UPDATE profiles SET full_name = 'Susan Vijaya', pod_id = 'pod-web-sales', status = 'active' WHERE id = 'user-1787631395149' OR email LIKE 'susan@%';

UPDATE updates SET profile_id = 'prof-pratap', pod_id = 'pod-elearning' WHERE profile_id = 'user-1787630983073';
UPDATE updates SET profile_id = 'prof-susan', pod_id = 'pod-web-sales' WHERE profile_id = 'user-1787631395149';

-- 8. Seed Default Passwords in user_credentials for all team members
INSERT INTO user_credentials (email, password_hash, profile_id)
VALUES 
  ('info@maplelearningsolutions.com', 'admin', 'prof-admin'),
  ('sandeep@maplelearningsolutions.com', 'admin', 'prof-sandeep'),
  ('raj.ayyanar@maplelearningsolutions.com', 'admin', 'prof-raj'),
  ('krishna@maplelearningsolutions.com', 'admin', 'prof-krishna'),
  ('rathish.rajendran@maplelearningsolutions.com', 'admin', 'prof-rathish'),
  ('renuka@maplelearningsolutions.com', 'password123', 'prof-renuka'),
  ('nithin@maplelearningsolutions.com', 'password123', 'prof-nithin'),
  ('raghavi@maplelearningsolutions.com', 'password123', 'prof-raghavi'),
  ('harshika@maplelearningsolutions.com', 'password123', 'prof-harshika'),
  ('susan@maplelearningsolutions.com', 'password123', 'prof-susan'),
  ('dhana@maplelearningsolutions.com', 'password123', 'prof-dhana'),
  ('christeena@maplelearningsolutions.com', 'password123', 'prof-christeena'),
  ('malavika@maplelearningsolutions.com', 'password123', 'prof-malavika'),
  ('pratap@maplelearningsolutions.com', 'password123', 'prof-pratap'),
  ('navyasree@maplelearningsolutions.com', 'password123', 'prof-navyasree'),
  ('varsha@maplelearningsolutions.com', 'password123', 'prof-varsha'),
  ('swathi@maplelearningsolutions.com', 'password123', 'prof-swathi'),
  ('bhanu.reddy@maplelearningsolutions.com', 'password123', 'prof-bhanu'),
  ('swetha@maplelearningsolutions.com', 'password123', 'prof-swetha'),
  ('abhishek@maplelearningsolutions.com', 'password123', 'prof-abhishek')
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  profile_id = EXCLUDED.profile_id,
  updated_at = NOW();
