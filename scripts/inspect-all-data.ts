import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectData() {
  console.log('=== FULL SUPABASE DATA AUDIT ===\n');

  const { data: updates } = await supabase.from('updates').select('*, profiles(full_name, email), pods(name)');
  console.log(`[UPDATES TABLE] Total: ${updates?.length || 0}`);
  updates?.forEach((u, i) => {
    console.log(` ${i + 1}. [${u.update_date}] ${u.profiles?.full_name || u.profile_id} (${u.pods?.name || u.pod_id}) - Status: ${u.status}`);
    console.log(`    Yesterday: ${u.yesterday?.slice(0, 60)}...`);
    console.log(`    Today: ${u.today?.slice(0, 60)}...`);
    if (u.has_blocker) console.log(`    🚨 Blocker: ${u.blocker}`);
  });

  const { data: blockers } = await supabase.from('blockers').select('*');
  console.log(`\n[BLOCKERS TABLE] Total: ${blockers?.length || 0}`);

  const { data: kudos } = await supabase.from('kudos').select('*');
  console.log(`\n[KUDOS TABLE] Total: ${kudos?.length || 0}`);

  const { data: comments } = await supabase.from('blocker_comments').select('*');
  console.log(`\n[BLOCKER COMMENTS TABLE] Total: ${comments?.length || 0}`);
}

inspectData();
