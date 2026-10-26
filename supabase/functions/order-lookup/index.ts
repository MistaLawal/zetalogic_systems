import { adminClient, clean, corsHeaders, ipHash, json } from '../_shared/common.ts';
import { orderView } from '../_shared/commerce.ts';

const attempts = new Map<string, { n: number; t: number }>();

// Guests find an order with its number + email, or with the private link token.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  // Soft per-instance rate limit against guessing
  const key = await ipHash(req); const now = Date.now();
  const a = attempts.get(key); if (a && now - a.t < 60_000 && a.n >= 10) return json({ error: 'Too many attempts. Wait a minute and try again.' }, 429);
  attempts.set(key, a && now - a.t < 60_000 ? { n: a.n + 1, t: a.t } : { n: 1, t: now });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const number = clean(body.orderNumber, 40).toUpperCase();
  const email = clean(body.email, 254).toLowerCase();
  const token = clean(body.token, 60);
  if (!number || (!email && !token)) return json({ error: 'Enter your order number and email address.' }, 400);
  const { data: o } = await adminClient().from('orders').select('id, email, access_token').eq('order_number', number).maybeSingle();
  const ok = o && ((email && o.email === email) || (token && o.access_token === token));
  if (!ok) return json({ error: 'We couldn’t find an order with those details. Check the order number and the email you used.' }, 404);
  return json({ order: await orderView(o!.id) });
});
