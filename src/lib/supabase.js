import { createClient } from '@supabase/supabase-js';

/** Use env vars so keys are not in source. Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY */
// Falls back to a syntactically valid placeholder when the env vars are
// absent (e.g. running unit tests with no .env) so createClient() doesn't
// throw at import time — any real Supabase call still fails, which is fine
// since those environments aren't expected to reach the network anyway.
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
