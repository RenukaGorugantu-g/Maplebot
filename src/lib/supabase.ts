import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nvbxkeouibmxuyxqiwua.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YnhrZW91aWJteHV5eHFpd3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTk4MzcsImV4cCI6MjEwMjc3NTgzN30.bSz0vzQ7RXkZ312eszWzOrd2f93EW8J5lqNonAJ6Q-U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
