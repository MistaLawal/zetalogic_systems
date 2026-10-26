import { adminClient, clean, corsHeaders, json } from '../_shared/common.ts';
import { orderView, paystackKey, verifyAndRecord } from '../_shared/commerce.ts';

// Called by the "payment complete" page. Verifies with Paystack on the server.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const reference = clean(body.reference, 80);
  if (!reference) return json({ error: 'Missing payment reference.' }, 400);
  const db = adminClient();
  const { data: tx } = await db.from('payment_transactions').select('order_id, status').eq('reference', reference).maybeSingle();
  if (!tx) return json({ error: 'We could not find that payment.' }, 404);
  if (tx.status === 'initialized' && paystackKey()) {
    try { await verifyAndRecord(reference); } catch (e) { console.error(String(e)); }
  }
  return json({ order: await orderView(tx.order_id) });
});
