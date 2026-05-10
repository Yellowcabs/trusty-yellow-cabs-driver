import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder');

if (!isConfigured) {
  console.warn('Supabase credentials missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://missing-config.supabase.co',
  isConfigured ? supabaseAnonKey : 'missing-config'
);

export const isSupabaseConfigured = isConfigured;
