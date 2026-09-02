import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectAllUpdates() {
  const { data: updates, error } = await supabase
    .from('updates')
    .select('*, profiles(id, full_name, email, role), pods(id, name)')
    .order('update_date', { ascending: false })
    .order('submitted_at', { ascending: true });

  if (error) {
    console.error('Error fetching updates:', error);
    return;
  }

  console.log(`Total Updates Found: ${updates.length}`);
  
  // Group by date
  const byDate = {};
  updates.forEach(u => {
    const d = u.update_date || 'No Date';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(u);
  });

  console.log('\nUpdates count by Date:');
  Object.keys(byDate).sort().reverse().forEach(d => {
    console.log(`- ${d}: ${byDate[d].length} updates`);
  });

  console.log('\nDetailed list of first 10 and last 10 updates:');
  updates.forEach((u, i) => {
    const empName = u.profiles?.full_name || u.profile_id;
    const podName = u.pods?.name || u.pod_id;
    console.log(`[${i+1}] ${u.update_date} | ${empName} | ${podName} | Submitted: ${u.submitted_at}`);
  });
}

inspectAllUpdates().catch(console.error);
