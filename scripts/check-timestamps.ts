import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTimestamps() {
  const { data: updates } = await supabase
    .from('updates')
    .select('id, profile_id, update_date, submitted_at, created_at, profiles(full_name)')
    .order('update_date', { ascending: true });

  console.log('=== CURRENT UPDATE TIMESTAMPS ===');
  updates?.forEach((u, i) => {
    console.log(`${i + 1}. [${u.update_date}] ${(u.profiles as any)?.full_name || u.profile_id} - Submitted At: ${u.submitted_at}`);
  });
}

checkTimestamps();
