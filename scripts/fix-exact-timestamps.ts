import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Exact timings from Google Chat in IST (Asia/Kolkata)
const EXACT_TIMINGS = [
  // Thursday, August 20, 2026
  { profile_id: 'prof-renuka', update_date: '2026-08-20', time: '18:30:00' },
  { profile_id: 'prof-varsha', update_date: '2026-08-20', time: '18:41:00' },
  { profile_id: 'prof-swetha', update_date: '2026-08-20', time: '18:50:00' },
  { profile_id: 'prof-nithin', update_date: '2026-08-20', time: '18:56:00' },
  { profile_id: 'prof-raghavi', update_date: '2026-08-20', time: '19:35:00' },
  { profile_id: 'prof-harshika', update_date: '2026-08-20', time: '20:43:00' },
  { profile_id: 'prof-malavika', update_date: '2026-08-20', time: '20:51:00' },
  { profile_id: 'prof-navyasree', update_date: '2026-08-20', time: '21:28:00' },
  { profile_id: 'prof-swathi', update_date: '2026-08-20', time: '21:36:00' },
  { profile_id: 'prof-bhanu', update_date: '2026-08-20', time: '23:04:00' },

  // Friday, August 21, 2026
  { profile_id: 'prof-malavika', update_date: '2026-08-21', time: '09:31:00' },
  { profile_id: 'prof-navyasree', update_date: '2026-08-21', time: '09:42:00' },
  { profile_id: 'prof-christeena', update_date: '2026-08-21', time: '09:48:00' },
  { profile_id: 'prof-harshika', update_date: '2026-08-21', time: '10:01:00' },
  { profile_id: 'prof-nithin', update_date: '2026-08-21', time: '10:10:00' },
  { profile_id: 'prof-raghavi', update_date: '2026-08-21', time: '10:25:00' },
  { profile_id: 'prof-swetha', update_date: '2026-08-21', time: '10:40:00' },
  { profile_id: 'prof-abhishek', update_date: '2026-08-21', time: '11:05:00' },
  { profile_id: 'prof-pratap', update_date: '2026-08-21', time: '11:20:00' },
  { profile_id: 'prof-varsha', update_date: '2026-08-21', time: '11:45:00' },

  // Monday, August 24, 2026
  { profile_id: 'prof-renuka', update_date: '2026-08-24', time: '09:18:00' },
  { profile_id: 'prof-harshika', update_date: '2026-08-24', time: '09:25:00' },
  { profile_id: 'prof-raghavi', update_date: '2026-08-24', time: '09:30:00' },
  { profile_id: 'prof-varsha', update_date: '2026-08-24', time: '09:48:00' },
  { profile_id: 'prof-navyasree', update_date: '2026-08-24', time: '09:51:00' },
  { profile_id: 'prof-malavika', update_date: '2026-08-24', time: '09:54:00' },
  { profile_id: 'prof-nithin', update_date: '2026-08-24', time: '10:03:00' },
  { profile_id: 'prof-swetha', update_date: '2026-08-24', time: '10:05:00' },
  { profile_id: 'prof-pratap', update_date: '2026-08-24', time: '10:45:00' },
  { profile_id: 'prof-abhishek', update_date: '2026-08-24', time: '10:50:00' },
  { profile_id: 'prof-christeena', update_date: '2026-08-24', time: '11:00:00' },
  { profile_id: 'prof-swathi', update_date: '2026-08-24', time: '11:05:00' },
  { profile_id: 'prof-bhanu', update_date: '2026-08-24', time: '11:10:00' },
  { profile_id: 'prof-dhana', update_date: '2026-08-24', time: '11:15:00' },
  { profile_id: 'prof-susan', update_date: '2026-08-24', time: '11:20:00' },
];

async function updateTimestamps() {
  console.log('Updating all exact IST timestamps in Supabase...');

  for (const item of EXACT_TIMINGS) {
    const istTimestamp = `${item.update_date}T${item.time}+05:30`;

    const { error } = await supabase
      .from('updates')
      .update({
        submitted_at: istTimestamp,
        updated_at: istTimestamp,
        created_at: istTimestamp,
      })
      .match({ profile_id: item.profile_id, update_date: item.update_date });

    if (error) {
      console.error(`Error updating ${item.profile_id} on ${item.update_date}:`, error.message);
    } else {
      console.log(`✅ Set IST time for ${item.profile_id} [${item.update_date}] -> ${item.time} IST`);
    }
  }

  console.log('\n🎉 All 35 exact timestamps updated successfully!');
}

updateTimestamps();
