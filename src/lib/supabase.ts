import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Browser client. Uses the publishable key only; Row Level Security protects all data. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      })
    : null;

export const supabaseUrl = url;
export const supabaseKey = key;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('The store database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}

/** Turn Supabase/PostgREST/Auth errors into sentences customers can act on. */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  const msg = (err as { message?: string })?.message ?? '';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'No connection. Check your internet and try again.';
  if (/Invalid login credentials/i.test(msg)) return 'That email and password don’t match an account.';
  if (/Email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link we sent.';
  if (/User already registered/i.test(msg)) return 'An account with this email already exists. Sign in instead.';
  if (/Password should be/i.test(msg)) return 'Use a password of at least 8 characters.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Wait a minute and try again.';
  return fallback;
}
