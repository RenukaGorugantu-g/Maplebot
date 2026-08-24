import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDateBreakdown() {
  const { data: updates } = await supabase.from('updates').select('update_date, profile_id, yesterday, today, profiles(full_name, pod_id, pods(name))');
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, pod_id, pods(name)');

  const dates = [...new Set(updates?.map(u => u.update_date))].sort();

  console.log('=== DATES IN DATABASE ===');
  dates.forEach(d => {
    const list = updates?.filter(u => u.update_date === d);
    console.log(`\n📅 Date: ${d} (${list?.length} submissions)`);
    list?.forEach(u => {
      console.log(`   • ${(u.profiles as any)?.full_name || u.profile_id} [${(u.profiles as any)?.pods?.name || 'No Pod'}]`);
    });
  });

  console.log('\n=== ALL PROFILES SUBMISSION STATUS ===');
  profiles?.forEach(p => {
    const userUpdates = updates?.filter(u => u.profile_id === p.id);
    console.log(`👤 ${p.full_name} (${(p.pods as any)?.name || p.pod_id}): ${userUpdates?.length} updates [${userUpdates?.map(u => u.update_date).join(', ')}]`);
  });
}

checkDateBreakdown();
