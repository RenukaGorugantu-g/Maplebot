import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_ORGANIZATION,
  INITIAL_PODS,
  INITIAL_PROFILES,
  INITIAL_CHECKIN,
  INITIAL_GOOGLE_CHAT_SETTINGS,
} from '../src/lib/demoData';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedSupabase() {
  console.log('Seeding initial organization structure into Supabase...');

  // 1. Organization
  const { error: orgErr } = await supabase.from('organizations').upsert({
    id: INITIAL_ORGANIZATION.id,
    name: INITIAL_ORGANIZATION.name,
    slug: INITIAL_ORGANIZATION.slug,
    timezone: INITIAL_ORGANIZATION.timezone,
  });
  console.log('Upserted Organization:', orgErr || 'Success');

  // 2. Pods
  const { error: podsErr } = await supabase.from('pods').upsert(
    INITIAL_PODS.map((p) => ({
      id: p.id,
      organization_id: p.organization_id,
      name: p.name,
      description: p.description,
      status: p.status,
    }))
  );
  console.log('Upserted Pods:', podsErr || 'Success');

  // 3. Profiles
  const { error: profsErr } = await supabase.from('profiles').upsert(
    INITIAL_PROFILES.map((pr) => ({
      id: pr.id,
      organization_id: pr.organization_id,
      full_name: pr.full_name,
      email: pr.email,
      role: pr.role,
      pod_id: pr.pod_id || null,
      timezone: pr.timezone || 'America/Toronto',
      status: pr.status || 'active',
    }))
  );
  console.log('Upserted Profiles:', profsErr || 'Success');

  // 4. Checkin
  const { error: chkErr } = await supabase.from('checkins').upsert({
    id: INITIAL_CHECKIN.id,
    organization_id: INITIAL_CHECKIN.organization_id,
    name: INITIAL_CHECKIN.name,
    description: INITIAL_CHECKIN.description,
    frequency: INITIAL_CHECKIN.frequency,
    active: INITIAL_CHECKIN.active,
    start_time: INITIAL_CHECKIN.start_time,
    deadline_time: INITIAL_CHECKIN.deadline_time,
    reminder_time: INITIAL_CHECKIN.reminder_time,
    days: INITIAL_CHECKIN.days,
    timezone: INITIAL_CHECKIN.timezone,
  });
  console.log('Upserted Checkin:', chkErr || 'Success');

  // 5. Checkin Questions
  const { error: qErr } = await supabase.from('checkin_questions').upsert(
    INITIAL_CHECKIN.questions.map((q) => ({
      id: q.id,
      checkin_id: q.checkin_id,
      question: q.question,
      question_type: q.question_type,
      required: q.required,
      sort_order: q.sort_order,
    }))
  );
  console.log('Upserted Checkin Questions:', qErr || 'Success');
}

seedSupabase();
