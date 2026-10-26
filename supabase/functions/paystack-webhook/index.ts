import { adminClient, json } from '../_shared/common.ts';
import { paystackKey, verifyAndRecord } from '../_shared/commerce.ts';

async function hmacSha512Hex(key: string, body: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const raw = await req.text();           // signature is over the raw body
  const key = paystackKey();
  const header = req.headers.get('x-paystack-signature') ?? '';
  const valid = !!key && !!header && safeEqual(await hmacSha512Hex(key, raw), header.toLowerCase());
  let payload: any = null; try { payload = JSON.parse(raw); } catch { /* keep null */ }
  const db = adminClient();
  const reference = payload?.data?.reference ?? null;
  const { data: logRow } = await db.from('payment_events').insert({
    provider: 'paystack', event: payload?.event ?? null, reference, signature_valid: valid, payload: valid ? payload : null,
  }).select('id').single();
  if (!valid) return new Response('Invalid signature', { status: 401 });

  let result = 'ignored';
  try {
    if (reference && ['charge.success', 'charge.failed'].includes(payload.event)) {
      // Never trust the webhook body alone: re-verify with the Paystack API.
      result = (await verifyAndRecord(reference)).result;
    } else if (payload.event === 'refund.processed') {
      result = 'refund_logged';
    }
  } catch (e) {
    console.error('webhook processing failed', String(e));
    result = 'error';
  }
  if (logRow) await db.from('payment_events').update({ processed: result !== 'error', result }).eq('id', logRow.id);
  // 200 tells Paystack to stop retrying; 500 makes it retry later.
  return json({ received: true }, result === 'error' ? 500 : 200);
});
