import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testExtraction() {
  const { data: updates } = await supabase
    .from('updates')
    .select('*, profiles(id, full_name, email, role), pods(id, name)')
    .order('update_date', { ascending: false })
    .order('submitted_at', { ascending: true });

  console.log(`Fetched ${updates.length} updates.`);

  const sample = updates.slice(0, 5).map(u => {
    const subDate = new Date(u.submitted_at || `${u.update_date}T10:00:00Z`);
    // Convert to IST
    const istTimeStr = subDate.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const istDateStr = subDate.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return {
      name: u.profiles?.full_name || u.profile_id,
      email: u.profiles?.email || '',
      pod: u.pods?.name || '',
      update_date: u.update_date,
      given_time_ist: istTimeStr,
      given_date_ist: istDateStr,
      submitted_at_raw: u.submitted_at,
      yesterday: u.yesterday,
      today: u.today,
      blocker: u.has_blocker ? u.blocker : 'None',
      status: u.status
    };
  });

  console.log('Sample processed:', sample);
}

testExtraction().catch(console.error);
