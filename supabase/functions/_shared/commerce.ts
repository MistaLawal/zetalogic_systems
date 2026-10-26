import { adminClient } from './common.ts';

const PAYSTACK = 'https://api.paystack.co';
export const paystackKey = () => Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

/** Origins customers may be sent back to after paying. */
export function allowedReturnUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const allowed = (Deno.env.get('SITE_URLS') ?? 'https://zetalogicsystems.vercel.app,http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const u = new URL(url);
    return allowed.some((a) => u.origin === new URL(a).origin) ? u.toString() : null;
  } catch { return null; }
}

export async function paystackInitialize(args: { email: string; amountKobo: number; reference: string; callbackUrl: string; orderNumber: string; orderId: string }) {
  const res = await fetch(`${PAYSTACK}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${paystackKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: args.email, amount: args.amountKobo, currency: 'NGN', reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: { order_id: args.orderId, order_number: args.orderNumber, custom_fields: [{ display_name: 'Order', variable_name: 'order_number', value: args.orderNumber }] },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.status) throw new Error(`paystack_init_failed: ${body.message ?? res.status}`);
  return body.data as { authorization_url: string; access_code: string; reference: string };
}

export async function paystackVerify(reference: string) {
  const res = await fetch(`${PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackKey()}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.status) return null;
  return body.data as { status: string; amount: number; currency: string; channel: string; reference: string; paid_at?: string };
}

/** Verify with Paystack, then record the result in the database (idempotent). */
export async function verifyAndRecord(reference: string) {
  const data = await paystackVerify(reference);
  if (!data) return { result: 'verify_failed' as const };
  const db = adminClient();
  const { data: result, error } = await db.rpc('record_paystack_result_internal', {
    p_reference: reference, p_status: data.status, p_amount: data.amount, p_currency: data.currency,
    p_channel: data.channel ?? null, p_response: data,
  });
  if (error) throw error;
  return { result: result as string, status: data.status };
}

export const newReference = (orderNumber: string) =>
  `${orderNumber}-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;

/** Read the signed-in user from the Authorization header, if any. */
export async function userFrom(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token.split('.').length !== 3) return null;
  const { data } = await adminClient().auth.getUser(token);
  return data.user?.id ?? null;
}

/** Customer-safe view of an order. */
export async function orderView(orderId: string) {
  const db = adminClient();
  const [o, items, events] = await Promise.all([
    db.from('orders').select('id, order_number, access_token, email, full_name, phone, delivery_method, ship_line1, ship_line2, ship_city, ship_state, ship_landmark, subtotal_kobo, discount_kobo, delivery_fee_kobo, total_kobo, coupon_code, payment_method, payment_status, fulfilment_status, carrier, tracking_number, created_at, paid_at').eq('id', orderId).single(),
    db.from('order_items').select('product_name, variant_name, sku, product_type, unit_price_kobo, quantity, line_total_kobo, product_id').eq('order_id', orderId),
    db.from('order_events').select('title, detail, created_at').eq('order_id', orderId).eq('customer_visible', true).order('created_at'),
  ]);
  if (o.error) throw o.error;
  return { ...o.data, items: items.data ?? [], events: events.data ?? [] };
}
