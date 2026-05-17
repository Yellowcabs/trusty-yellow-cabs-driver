import { createClient } from '@supabase/supabase-js';

// Read from your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// FALLBACK: If environment variables fail to load in the APK, 
// replace these strings with your actual hardcoded project credentials.
const fallbackUrl = 'https://your-actual-project-id.supabase.co'; 
const fallbackAnonKey = 'your-actual-anon-public-key-string';

export const supabase = createClient(
  supabaseUrl || fallbackUrl, 
  supabaseAnonKey || fallbackAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false // Essential flag for native Capacitor mobile applications
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export const isSupabaseConfigured = !!(supabaseUrl || fallbackUrl);