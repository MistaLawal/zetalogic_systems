import { adminClient, clean, corsHeaders, ipHash, isEmail, json } from '../_shared/common.ts';

const CONSENT_TEXT = 'I agree to receive marketing emails from Zetalogic Systems.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Send the form as JSON.' }, 400); }
  if (clean(body.website, 200)) return json({ ok: true });

  const email = clean(body.email, 254).toLowerCase();
  if (!isEmail(email)) return json({ error: 'Enter a valid email address.' }, 422);
  if (body.consent !== true) return json({ error: 'Consent is required to subscribe.' }, 422);

  const db = adminClient();
  const hash = await ipHash(req);
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await db.from('newsletter_subscriptions').select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash).gte('created_at', since);
  if ((count ?? 0) >= 5) return json({ error: 'Too many sign-ups from this connection. Try again later.' }, 429);

  // Re-subscribing an existing address clears any earlier unsubscribe.
  const { error } = await db.from('newsletter_subscriptions').upsert(
    { email, consent_text: CONSENT_TEXT, consented_at: new Date().toISOString(), unsubscribed_at: null, ip_hash: hash },
    { onConflict: 'email' },
  );
  if (error) {
    console.error('subscribe failed', error.code, error.message);
    return json({ error: 'Subscription could not be saved. Try again shortly.' }, 500);
  }
  return json({ ok: true }, 201);
});
