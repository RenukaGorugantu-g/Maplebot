import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Fetching all tables...');
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log(`Profiles: ${profiles?.length}`);
  
  const { data: pods } = await supabase.from('pods').select('*');
  console.log(`Pods: ${pods?.length}`);
  
  const { data: updates, error: errUpdates } = await supabase
    .from('updates')
    .select('*, profiles(*), pods(*)');
  console.log(`Updates: ${updates?.length}`, errUpdates ? errUpdates : '');

  const { data: blockers } = await supabase.from('blockers').select('*');
  console.log(`Blockers: ${blockers?.length}`);

  const { data: kudos } = await supabase.from('kudos').select('*');
  console.log(`Kudos: ${kudos?.length}`);

  if (updates && updates.length > 0) {
    console.log('\nSample update record:', JSON.stringify(updates[0], null, 2));
  }
}

main().catch(console.error);
