import { adminClient, clean, corsHeaders, isEmail, isNigerianPhone, json } from '../_shared/common.ts';
import { allowedReturnUrl, newReference, orderView, paystackInitialize, paystackKey, userFrom } from '../_shared/commerce.ts';

// Maps database error codes to customer-facing messages.
function explain(msg: string): { status: number; error: string; code: string } {
  const [code, rest = ''] = msg.split(':');
  const m: Record<string, string> = {
    EMPTY_CART: 'Your cart is empty.',
    TOO_MANY_ITEMS: 'Too many different items in one order. Split it into two orders.',
    BAD_QUANTITY: 'Quantities must be between 1 and 10.',
    UNAVAILABLE: 'One of the items is no longer available. Remove it from your cart and try again.',
    CHOOSE_OPTION: `Choose an option for ${rest} on its product page.`,
    OUT_OF_STOCK: `Not enough stock for ${rest.split('|')[0]}. Only ${rest.split('|')[1] ?? 0} left.`,
    CHOOSE_DELIVERY: 'Choose a delivery option.',
    ADDRESS_REQUIRED: 'Enter your delivery address.',
    ZONE_STATE: 'That delivery option does not cover your state. Choose another option.',
    BAD_COUPON: 'That discount code is not valid or has expired.',
    COUPON_MINIMUM: 'Your order is below the minimum for that discount code.',
  };
  return { status: 422, error: m[code] ?? 'Your order could not be placed. Try again.', code };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = adminClient();

  // GET: which payment methods are available right now
  if (req.method === 'GET') {
    const { data } = await db.from('store_settings').select('value').eq('key', 'bank_transfer').maybeSingle();
    const bt = (data?.value ?? {}) as Record<string, unknown>;
    const bankReady = bt.enabled === true && !!bt.bank_name && !!bt.account_name && !!bt.account_number;
    return json({ paystack: !!paystackKey(), bankTransfer: bankReady ? { bankName: bt.bank_name, accountName: bt.account_name, accountNumber: bt.account_number } : null });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: 'Send the order as JSON.' }, 400); }
  const userId = await userFrom(req);

  // Retry payment for an existing unpaid Paystack order
  if (body.action === 'retry') {
    const { data: o } = await db.from('orders').select('id, order_number, email, total_kobo, payment_status, payment_method, access_token')
      .eq('order_number', clean(body.orderNumber, 40)).maybeSingle();
    if (!o || o.access_token !== body.token) return json({ error: 'Order not found.' }, 404);
    if (o.payment_method !== 'paystack' || !['unpaid', 'failed'].includes(o.payment_status)) return json({ error: 'This order does not need payment.' }, 409);
    const callback = allowedReturnUrl(body.returnUrl);
    if (!callback || !paystackKey()) return json({ error: 'Online payment is not available right now.' }, 503);
    const reference = newReference(o.order_number);
    await db.from('payment_transactions').insert({ order_id: o.id, provider: 'paystack', reference, amount_kobo: o.total_kobo });
    const init = await paystackInitialize({ email: o.email, amountKobo: o.total_kobo, reference, callbackUrl: callback, orderNumber: o.order_number, orderId: o.id });
    return json({ authorizationUrl: init.authorization_url, reference });
  }

  // New order: validate contact details on the server
  const c = body.contact ?? {}; const a = body.address ?? {};
  const email = clean(c.email, 254).toLowerCase(); const phone = clean(c.phone, 20); const fullName = clean(c.fullName, 120);
  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = 'Enter your full name.';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isNigerianPhone(phone)) errors.phone = 'Enter a Nigerian phone number.';
  const method = body.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'paystack';
  if (Object.keys(errors).length) return json({ error: 'Some details need attention.', fields: errors }, 422);

  const callback = allowedReturnUrl(body.returnUrl);
  if (method === 'paystack' && (!paystackKey() || !callback)) return json({ error: 'Online payment is not available right now. Choose bank transfer or contact us.' }, 503);
  if (method === 'bank_transfer') {
    const { data } = await db.from('store_settings').select('value').eq('key', 'bank_transfer').maybeSingle();
    if ((data?.value as any)?.enabled !== true) return json({ error: 'Bank transfer is not available right now.' }, 503);
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 30).map((i: any) => ({
    product_id: clean(i.productId, 40), variant_id: clean(i.variantId, 40) || null, quantity: Number(i.quantity),
  })) : [];

  const { data: created, error } = await db.rpc('create_order_internal', { p: {
    items, user_id: userId, email, phone, full_name: fullName,
    zone_id: clean(body.zoneId, 40) || null, coupon_code: clean(body.couponCode, 30) || null,
    line1: clean(a.line1, 200), line2: clean(a.line2, 200), city: clean(a.city, 80), state: clean(a.state, 40), landmark: clean(a.landmark, 120),
    payment_method: method, note: clean(body.note, 1000),
  } });
  if (error) {
    const e = explain(error.message ?? '');
    if (e.code === error.message) console.error('create_order failed', error.message);
    return json({ error: e.error, code: e.code }, e.status);
  }
  const order = created as { order_id: string; order_number: string; total_kobo: number; access_token: string; email: string };

  // Save the address to the customer's account if asked
  if (userId && body.saveAddress && a.line1) {
    await db.from('addresses').insert({ user_id: userId, full_name: fullName, phone, line1: clean(a.line1, 200), line2: clean(a.line2, 200) || null,
      city: clean(a.city, 80), state: clean(a.state, 40), landmark: clean(a.landmark, 120) || null });
  }
  if (userId) await db.from('cart_items').delete().eq('user_id', userId);

  if (method === 'bank_transfer') {
    return json({ orderNumber: order.order_number, token: order.access_token, order: await orderView(order.order_id) }, 201);
  }

  const reference = newReference(order.order_number);
  await db.from('payment_transactions').insert({ order_id: order.order_id, provider: 'paystack', reference, amount_kobo: order.total_kobo });
  try {
    const init = await paystackInitialize({ email: order.email, amountKobo: order.total_kobo, reference, callbackUrl: callback!, orderNumber: order.order_number, orderId: order.order_id });
    return json({ orderNumber: order.order_number, token: order.access_token, authorizationUrl: init.authorization_url, reference }, 201);
  } catch (e) {
    console.error(String(e));
    return json({ orderNumber: order.order_number, token: order.access_token, error: 'Your order was saved but the payment page could not open. Use "Pay now" on your order page to try again.' }, 502);
  }
});
