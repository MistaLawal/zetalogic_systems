import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Copy, Landmark, Loader2, MessageCircle, PackageSearch, XCircle } from 'lucide-react';
import { Container, Button, ButtonA, ButtonLink } from '../../components/ui';
import { callFunction } from '../../lib/api';
import { formatNaira } from '../../lib/money';
import { whatsappHref } from '../../lib/contact';
import { usePageMeta } from '../../lib/seo';
import { useSettings } from '../../context/SettingsContext';
import type { OrderView } from '../../data/cart';

export const paymentLabel: Record<string, { text: string; tone: string }> = {
  unpaid: { text: 'Awaiting payment', tone: 'bg-[#FFF4D6] text-[#B54708]' },
  awaiting_transfer: { text: 'Awaiting bank transfer', tone: 'bg-[#FFF4D6] text-[#B54708]' },
  paid: { text: 'Paid', tone: 'bg-brand-tint text-brand-deep' },
  failed: { text: 'Payment failed', tone: 'bg-[#FEF3F2] text-[#B42318]' },
  refunded: { text: 'Refunded', tone: 'bg-paper-grey text-muted' },
  partially_refunded: { text: 'Partly refunded', tone: 'bg-paper-grey text-muted' },
};
export const fulfilmentLabel: Record<string, string> = {
  unfulfilled: 'Not started', processing: 'Preparing', ready_for_pickup: 'Ready for pickup',
  shipped: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled',
};
const fmtDate = (d: string) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function BankDetails({ order }: { order: OrderView }) {
  const bt = useSettings().bank_transfer;
  const [copied, setCopied] = useState(false);
  if (!bt?.account_number) return null;
  return (
    <div className="rounded-card border-2 border-brand bg-brand-mist p-5">
      <p className="flex items-center gap-2 font-bold text-ink"><Landmark className="h-5 w-5 text-brand-deep" aria-hidden="true" />Transfer {formatNaira(order.total_kobo)} to:</p>
      <dl className="mt-3 grid gap-1.5 text-[0.95rem]">
        <div className="flex gap-2"><dt className="w-36 text-muted">Bank</dt><dd className="font-semibold">{bt.bank_name}</dd></div>
        <div className="flex gap-2"><dt className="w-36 text-muted">Account name</dt><dd className="font-semibold">{bt.account_name}</dd></div>
        <div className="flex items-center gap-2"><dt className="w-36 text-muted">Account number</dt><dd className="font-semibold tabular-nums">{bt.account_number}</dd>
          <button type="button" onClick={() => navigator.clipboard?.writeText(bt.account_number).then(() => setCopied(true)).catch(() => {})} className="inline-flex items-center gap-1 rounded px-1.5 text-xs font-semibold text-brand-deep"><Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy'}</button></div>
        <div className="flex gap-2"><dt className="w-36 text-muted">Narration</dt><dd className="font-semibold">{order.order_number}</dd></div>
      </dl>
      <p className="mt-3 text-sm text-muted">Use your order number as the narration. We’ll confirm your payment and update this page, usually within a few working hours.</p>
      <ButtonA href={whatsappHref(`Hello Zetalogic, I have paid for order ${order.order_number}. Here is my receipt.`)} variant="outline" className="mt-4"><MessageCircle className="h-4 w-4" aria-hidden="true" />Send payment receipt</ButtonA>
    </div>
  );
}

export function OrderDetails({ order, token }: { order: OrderView; token?: string }) {
  const pay = paymentLabel[order.payment_status] ?? { text: order.payment_status, tone: 'bg-paper-grey' };
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const canRetry = order.payment_method === 'paystack' && ['unpaid', 'failed'].includes(order.payment_status) && !!token;

  const retry = async () => {
    setRetrying(true); setRetryError(null);
    try {
      const base = window.location.origin + (import.meta.env.VITE_ROUTER === 'hash' ? window.location.pathname + '#' : '');
      const r = await callFunction<{ authorizationUrl: string }>('checkout', { body: { action: 'retry', orderNumber: order.order_number, token, returnUrl: `${base}/checkout/complete` } });
      window.location.assign(r.authorizationUrl);
    } catch (e) { setRetryError((e as Error).message); setRetrying(false); }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${pay.tone}`}>{pay.text}</span>
          {order.payment_status === 'paid' && <span className="rounded-full bg-paper-grey px-3 py-1 text-sm font-semibold text-ink">{fulfilmentLabel[order.fulfilment_status]}</span>}
        </div>
        {order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_transfer' && <BankDetails order={order} />}
        {canRetry && (
          <div className="rounded-card border border-paper-line p-5">
            <p className="font-semibold text-ink">This order hasn’t been paid yet.</p>
            <Button onClick={retry} disabled={retrying} className="mt-3">{retrying ? 'Opening Paystack…' : `Pay ${formatNaira(order.total_kobo)} now`}</Button>
            {retryError && <p role="alert" className="mt-2 text-sm text-[#B42318]">{retryError}</p>}
          </div>
        )}
        <section>
          <h2 className="font-bold text-ink">Items</h2>
          <ul className="mt-3 divide-y divide-paper-line border-y border-paper-line">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4 py-3 text-[0.95rem]">
                <span className="min-w-0"><span className="tabular-nums">{it.quantity} ×</span> {it.product_name}{it.variant_name && <span className="text-muted"> · {it.variant_name}</span>}<span className="block text-xs text-muted">SKU {it.sku}</span></span>
                <span className="shrink-0 tabular-nums">{formatNaira(it.line_total_kobo)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 text-[0.95rem]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatNaira(order.subtotal_kobo)}</dd></div>
            {order.discount_kobo > 0 && <div className="flex justify-between text-brand-deep"><dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd className="tabular-nums">−{formatNaira(order.discount_kobo)}</dd></div>}
            {order.delivery_method && <div className="flex justify-between"><dt className="text-muted">{order.delivery_method}</dt><dd className="tabular-nums">{order.delivery_fee_kobo === 0 ? 'Free' : formatNaira(order.delivery_fee_kobo)}</dd></div>}
            <div className="flex justify-between border-t border-paper-line pt-2 text-lg font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(order.total_kobo)}</dd></div>
          </dl>
        </section>
      </div>
      <aside className="space-y-6">
        <section className="rounded-card border border-paper-line p-5">
          <h2 className="font-bold text-ink">Progress</h2>
          <ol className="mt-4 space-y-4 border-l-2 border-paper-line pl-4">
            {order.events.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
                <p className="font-semibold text-ink">{e.title}</p>
                {e.detail && <p className="text-sm text-muted">{e.detail}</p>}
                <p className="text-xs text-muted">{fmtDate(e.created_at)}</p>
              </li>
            ))}
          </ol>
          {order.tracking_number && <p className="mt-4 text-sm"><span className="text-muted">Tracking:</span> <span className="font-semibold">{order.carrier ? `${order.carrier} ` : ''}{order.tracking_number}</span></p>}
        </section>
        <section className="rounded-card border border-paper-line p-5 text-sm">
          <h2 className="font-bold text-ink">Delivery details</h2>
          <p className="mt-2 text-ink/85">{order.full_name}<br />{order.phone}<br />{order.email}</p>
          {order.ship_line1 && <p className="mt-2 text-ink/85">{order.ship_line1}{order.ship_line2 ? `, ${order.ship_line2}` : ''}<br />{order.ship_city}, {order.ship_state}{order.ship_landmark && <><br />Landmark: {order.ship_landmark}</>}</p>}
          {!order.ship_line1 && order.delivery_method && <p className="mt-2 text-ink/85">{order.delivery_method}</p>}
        </section>
        <ButtonA href={whatsappHref(`Hello Zetalogic, I have a question about order ${order.order_number}.`)} variant="outline" className="w-full"><MessageCircle className="h-4 w-4" aria-hidden="true" />Ask about this order</ButtonA>
      </aside>
    </div>
  );
}

/** /orders/:number?token=… — private order page (guests and customers) */
export function OrderPage() {
  const { number = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const placed = params.get('placed') === '1';
  usePageMeta(`Order ${number}`, 'Your order status.');
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; order?: OrderView; message?: string }>({ status: 'loading' });
  useEffect(() => {
    callFunction<{ order: OrderView }>('order-lookup', { body: { orderNumber: number, token } })
      .then((r) => setState({ status: 'ready', order: r.order }))
      .catch((e) => setState({ status: 'error', message: e.message }));
  }, [number, token]);

  return (
    <Container className="py-10 lg:py-14">
      {state.status === 'loading' ? <p className="text-muted" aria-busy="true">Loading your order…</p>
        : state.status === 'error' ? (
          <div className="mx-auto max-w-md text-center"><p role="alert" className="text-muted">{state.message}</p><ButtonLink to="/track-order" variant="outline" className="mt-6">Find your order</ButtonLink></div>
        ) : (
          <>
            {placed && (
              <div className="mb-8 flex items-start gap-3 rounded-card bg-brand-mist p-5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-deep" aria-hidden="true" />
                <div><p className="font-bold text-ink">Order placed. Thank you!</p><p className="text-sm text-muted">Save this page’s link to check your order later, or use Track order with your order number and email.</p></div>
              </div>
            )}
            <p className="text-sm text-muted">Placed {fmtDate(state.order!.created_at)}</p>
            <h1 className="mt-1 text-[clamp(1.6rem,3vw,2.25rem)] font-extrabold tracking-tight text-ink">Order {state.order!.order_number}</h1>
            <div className="mt-8"><OrderDetails order={state.order!} token={token} /></div>
          </>
        )}
    </Container>
  );
}

/** /checkout/complete?reference=… — Paystack sends customers here after paying. */
export function CheckoutComplete() {
  usePageMeta('Payment status', 'Checking your payment.');
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref') ?? '';
  const [state, setState] = useState<{ status: 'checking' | 'done' | 'error'; order?: OrderView; message?: string }>({ status: 'checking' });

  useEffect(() => {
    if (!reference) { setState({ status: 'error', message: 'This link is missing its payment reference.' }); return; }
    let tries = 0; let live = true;
    const check = async () => {
      try {
        const r = await callFunction<{ order: OrderView }>('payment-status', { body: { reference } });
        if (!live) return;
        // Bank and USSD payments can take a moment to confirm.
        if (r.order.payment_status === 'unpaid' && tries < 5) { tries++; setTimeout(check, 3000); setState({ status: 'checking', order: r.order }); return; }
        setState({ status: 'done', order: r.order });
      } catch (e) { if (live) setState({ status: 'error', message: (e as Error).message }); }
    };
    void check();
    return () => { live = false; };
  }, [reference]);

  const o = state.order;
  const paid = o?.payment_status === 'paid';
  return (
    <Container className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        {state.status === 'checking' ? (
          <><Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-deep" aria-hidden="true" /><h1 className="mt-4 text-h2 text-ink">Confirming your payment…</h1><p className="mt-2 text-muted">This usually takes a few seconds. Don’t close this page.</p></>
        ) : state.status === 'error' ? (
          <><XCircle className="mx-auto h-10 w-10 text-[#B42318]" aria-hidden="true" /><h1 className="mt-4 text-h2 text-ink">We couldn’t check this payment</h1><p className="mt-2 text-muted">{state.message}</p><ButtonLink to="/track-order" variant="outline" className="mt-6">Find your order</ButtonLink></>
        ) : paid ? (
          <><CheckCircle2 className="mx-auto h-12 w-12 text-brand-deep" aria-hidden="true" /><h1 className="mt-4 text-h2 text-ink">Payment received</h1><p className="mt-2 text-muted">Order {o!.order_number} is confirmed. A receipt has been sent to {o!.email}.</p></>
        ) : (
          <><Clock className="mx-auto h-10 w-10 text-[#B54708]" aria-hidden="true" /><h1 className="mt-4 text-h2 text-ink">{o?.payment_status === 'failed' ? 'Payment didn’t go through' : 'Payment not confirmed yet'}</h1><p className="mt-2 text-muted">{o?.payment_status === 'failed' ? 'No money was taken. You can try again from your order page.' : 'If you completed payment, it will show on your order page shortly.'}</p></>
        )}
        {o && <ButtonLink to={`/orders/${o.order_number}?token=${o.access_token}`} className="mt-8">View order</ButtonLink>}
      </div>
    </Container>
  );
}

/** /track-order — find an order with its number and email */
export function TrackOrder() {
  usePageMeta('Track your order', 'Check the status of your Zetalogic Systems order.');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'error' | 'ready'; order?: OrderView; message?: string }>({ status: 'idle' });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !email.trim()) return setState({ status: 'error', message: 'Enter your order number and email address.' });
    setState({ status: 'loading' });
    try { const r = await callFunction<{ order: OrderView }>('order-lookup', { body: { orderNumber: number.trim(), email: email.trim() } }); setState({ status: 'ready', order: r.order }); }
    catch (err) { setState({ status: 'error', message: (err as Error).message }); }
  };
  return (
    <Container className="py-10 lg:py-14">
      <h1 className="text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold tracking-tight text-ink">Track your order</h1>
      <p className="mt-2 text-muted">Your order number starts with ZLS and is in your confirmation email.</p>
      <form onSubmit={submit} className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row" noValidate>
        <label htmlFor="to-num" className="sr-only">Order number</label>
        <input id="to-num" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="ZLS-261026-AB12C" className="h-12 flex-1 rounded-btn border border-paper-line px-4 uppercase" />
        <label htmlFor="to-email" className="sr-only">Email address</label>
        <input id="to-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email used for the order" className="h-12 flex-1 rounded-btn border border-paper-line px-4" />
        <Button type="submit" disabled={state.status === 'loading'} className="h-12"><PackageSearch className="h-4 w-4" aria-hidden="true" />{state.status === 'loading' ? 'Finding…' : 'Find order'}</Button>
      </form>
      {state.status === 'error' && <p role="alert" className="mt-4 text-[#B42318]">{state.message}</p>}
      {state.status === 'ready' && (
        <div className="mt-10">
          <h2 className="text-h3 text-ink">Order {state.order!.order_number}</h2>
          <div className="mt-6"><OrderDetails order={state.order!} /></div>
          <Link to={`/orders/${state.order!.order_number}?token=${state.order!.access_token}`} className="mt-6 inline-block text-sm font-semibold text-brand-deep underline">Open this order’s private page</Link>
        </div>
      )}
    </Container>
  );
}
