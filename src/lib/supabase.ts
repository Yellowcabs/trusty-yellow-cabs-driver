import { createClient } from '@supabase/supabase-js';

// ONLY VITE VARIABLES
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// CHECK CONFIG
const isConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder');

if (!isConfigured) {
  console.error(
    '[SUPABASE ERROR] Missing Supabase ENV Variables'
  );
}

// CREATE CLIENT
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseConfigured =
  isConfigured;

console.log(
  '[SUPABASE]',
  isConfigured
    ? 'Connected Successfully'
    : 'Not Configured'
);