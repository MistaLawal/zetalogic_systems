import { adminClient, clean, corsHeaders, ipHash, isEmail, isNigerianPhone, json } from '../_shared/common.ts';

const CONTACT_METHODS = ['Phone call', 'WhatsApp', 'Email'];
const WINDOW_MINUTES = 15;
const MAX_PER_WINDOW = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Send the form as JSON.' }, 400); }

  // Honeypot: real people never fill this field. Pretend success for bots.
  if (clean(body.website, 200)) return json({ ok: true });

  const fullName = clean(body.fullName, 120);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 20);
  const businessName = clean(body.businessName, 160) || null;
  const service = clean(body.service, 120);
  const description = clean(body.description, 5000);
  const contactMethod = clean(body.contactMethod, 20);
  const budget = body.budgetKobo;

  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = 'Enter your full name.';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isNigerianPhone(phone)) errors.phone = 'Enter a Nigerian phone number.';
  if (!service) errors.service = 'Choose a service.';
  if (description.length < 20) errors.description = 'Describe the project in at least 20 characters.';
  if (!CONTACT_METHODS.includes(contactMethod)) errors.contactMethod = 'Choose a contact method.';
  if (budget != null && !(Number.isSafeInteger(budget) && (budget as number) >= 0)) errors.budgetKobo = 'Budget must be a whole number of kobo.';
  if (Object.keys(errors).length) return json({ error: 'Some fields need attention.', fields: errors }, 422);

  const db = adminClient();
  const hash = await ipHash(req);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countErr } = await db
    .from('service_enquiries').select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash).gte('created_at', since);
  if (countErr) return json({ error: 'The enquiry could not be saved. Try again shortly.' }, 500);
  if ((count ?? 0) >= MAX_PER_WINDOW) {
    return json({ error: `Too many enquiries from this connection. Try again in ${WINDOW_MINUTES} minutes or message us on WhatsApp.` }, 429);
  }

  const { error } = await db.from('service_enquiries').insert({
    full_name: fullName, email, phone, business_name: businessName, service,
    budget_kobo: budget ?? null, description, contact_method: contactMethod, ip_hash: hash,
  });
  if (error) {
    console.error('insert failed', error.code, error.message);
    return json({ error: 'The enquiry could not be saved. Try again shortly.' }, 500);
  }
  return json({ ok: true }, 201);
});
