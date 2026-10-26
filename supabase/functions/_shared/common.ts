import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Admin client (bypasses RLS). Server-side only. */
export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try { key = JSON.parse(secretKeys)['default'] ?? key; } catch { /* fall back */ }
  }
  return createClient(url, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Salted hash of the caller's IP so rate limits work without storing raw IPs. */
export async function ipHash(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const salt = Deno.env.get('IP_HASH_SALT') ?? Deno.env.get('SUPABASE_URL') ?? '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const isNigerianPhone = (v: unknown): v is string =>
  typeof v === 'string' && /^(\+?234|0)[789][01]\d{8}$/.test(v.replace(/[\s-]/g, ''));

/** Trim, collapse control characters and cap length. */
export function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
