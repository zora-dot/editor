import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project details
const supabaseUrl = 'https://grdbbwflcmjhvusjczul.supabase.co';  // 🔄 Add your actual Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZGJid2ZsY21qaHZ1c2pjenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4OTQ4NDgsImV4cCI6MjA1NDQ3MDg0OH0.iQSYd_u5YLg9fR8YqdJxYhuhPEyaeBEHV8dXyL0MMsU'; // 🔄 Add your actual Supabase API key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
