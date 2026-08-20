import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log('Testing Supabase queries...');

  const { data: orgs, error: orgError } = await supabase.from('organizations').select('*');
  console.log('Organizations:', { count: orgs?.length, orgError });

  const { data: pods, error: podError } = await supabase.from('pods').select('*');
  console.log('Pods:', { count: pods?.length, podError });

  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  console.log('Profiles:', { count: profiles?.length, profError });

  const { data: updates, error: updError } = await supabase.from('updates').select('*');
  console.log('Updates:', { count: updates?.length, updError });

  const { data: blockers, error: blkError } = await supabase.from('blockers').select('*');
  console.log('Blockers:', { count: blockers?.length, blkError });

  const { data: checkins, error: chkError } = await supabase.from('checkins').select('*');
  console.log('Checkins:', { count: checkins?.length, chkError });

  const { data: checkinQuestions, error: qError } = await supabase.from('checkin_questions').select('*');
  console.log('Checkin Questions:', { count: checkinQuestions?.length, qError });
}

testSupabase();
