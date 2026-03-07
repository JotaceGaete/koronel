import { createClient } from '@supabase/supabase-js';

/** Use env vars so keys are not in source. Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY */
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
