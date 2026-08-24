const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- Checking Supabase tables ---');

  const tables = ['organizations', 'pods', 'profiles', 'checkins', 'checkin_questions', 'updates', 'blockers', 'kudos', 'google_chat_settings'];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.log(`[${t}] ERROR:`, error.message, error.code);
    } else {
      console.log(`[${t}] Count: ${data.length}`, data.length > 0 ? `(IDs: ${data.map(d => d.id || d.name || d.full_name).slice(0, 5).join(', ')})` : '');
    }
  }
}

main().catch(err => console.error('Script error:', err));
