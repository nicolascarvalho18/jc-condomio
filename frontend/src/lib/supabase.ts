import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const projectSupabaseUrl = 'https://ckqrrulswrabxxxozgeu.supabase.co';
const projectSupabasePublishableKey = 'sb_publishable_hjVCoQ0t44fnomgnyTqR6w_nYzEz8W3';

// This is a Supabase publishable key, which is designed to be used by browser
// clients and remains protected by Auth/RLS. Keeping the active project value
// here prevents a stale Vercel environment variable from breaking login.
const supabaseUrl = projectSupabaseUrl;
const supabasePublishableKey = projectSupabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// This is intentionally the publishable/anon key only. Never put a Supabase
// secret or service-role key in Vite variables: they are sent to the browser.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase não está configurado neste ambiente.');
  }
  return supabase;
};
