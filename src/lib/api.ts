import { supabase, supabaseKey, supabaseUrl } from './supabase';

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown> = {}) { super(message); }
}

/** Call one of our Edge Functions. Sends the customer's session when signed in. */
export async function callFunction<T>(name: string, opts: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  if (!supabaseUrl || !supabaseKey) throw new ApiError('The store is not connected right now.', 0);
  const headers: Record<string, string> = { apikey: supabaseKey };
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? 'Something went wrong. Try again.', res.status, body);
  return body as T;
}

/** Turn database error codes (from quote_cart) into sentences. */
export function cartErrorMessage(raw: string): string {
  const [code, rest = ''] = raw.split(':');
  switch (code) {
    case 'EMPTY_CART': return 'Your cart is empty.';
    case 'UNAVAILABLE': return 'An item in your cart is no longer available. Remove it to continue.';
    case 'CHOOSE_OPTION': return `Choose an option for ${rest} on its product page.`;
    case 'OUT_OF_STOCK': { const [name, n] = rest.split('|'); return `Only ${n} left of ${name}. Lower the quantity to continue.`; }
    case 'BAD_QUANTITY': return 'Quantities must be between 1 and 10.';
    case 'CHOOSE_DELIVERY': return 'Choose a delivery option.';
    case 'BAD_COUPON': return 'That discount code is not valid or has expired.';
    case 'COUPON_MINIMUM': return `Spend at least ₦${(Number(rest) / 100).toLocaleString('en-NG')} to use that code.`;
    default: return 'Your cart could not be checked. Refresh and try again.';
  }
}
