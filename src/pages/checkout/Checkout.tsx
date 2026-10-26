import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CreditCard, Landmark, Lock, MessageCircle, Tag } from 'lucide-react';
import { Container, Button, ButtonA } from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getCartRows, getZones, quote, type Quote, type Zone } from '../../data/cart';
import { useAsync } from '../../data/useAsync';
import { callFunction, ApiError, cartErrorMessage } from '../../lib/api';
import { formatNaira } from '../../lib/money';
import { isEmail, isNigerianPhone } from '../../lib/forms';
import { whatsappHref } from '../../lib/contact';
import { supabase } from '../../lib/supabase';
import { usePageMeta } from '../../lib/seo';
import { NIGERIAN_STATES } from '../account/Account';

type Config = { paystack: boolean; bankTransfer: { bankName: string; accountName: string; accountNumber: string } | null };
type SavedAddress = { id: string; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; landmark: string | null; is_default: boolean };

const input = 'w-full rounded-btn border border-paper-line bg-white px-3.5 py-3 text-[0.95rem] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-[#B42318]';

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-paper-line bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-3 font-bold text-ink"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-sm text-white tabular-nums">{n}</span>{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Field({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[0.88rem] font-semibold text-ink">{label}{optional && <span className="font-normal text-muted"> (optional)</span>}</label>
      {children}
      {error && <p className="mt-1 text-[0.82rem] text-[#B42318]">{error}</p>}
    </div>
  );
}

export default function Checkout() {
  usePageMeta('Checkout', 'Complete your order.');
  const { lines, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const key = lines.map((l) => `${l.productId}:${l.variantId ?? ''}:${l.quantity}`).join(',');
  const rows = useAsync(() => getCartRows(lines), [key]);
  const zones = useAsync(getZones, []);
  const config = useAsync(() => callFunction<Config>('checkout', { method: 'GET' }), []);
  const saved = useAsync<SavedAddress[]>(async () => {
    if (!user || !supabase) return [];
    const { data } = await supabase.from('addresses').select('*').order('is_default', { ascending: false });
    return (data ?? []) as SavedAddress[];
  }, [user?.id]);

  const [contact, setContact] = useState({ fullName: '', email: '', phone: '' });
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: 'Lagos', landmark: '' });
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<'paystack' | 'bank_transfer' | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; data?: Quote; message?: string }>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prefill from the account
  useEffect(() => {
    setContact((c) => ({ fullName: c.fullName || profile?.full_name || '', email: c.email || user?.email || '', phone: c.phone || profile?.phone || '' }));
  }, [user, profile]);
  useEffect(() => {
    if (saved.status === 'ready' && saved.data[0] && !addr.line1) {
      const a = saved.data[0];
      setAddr({ line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, landmark: a.landmark ?? '' });
      setSaveAddress(false);
    }
  }, [saved.status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (config.status === 'ready' && !method) setMethod(config.data.paystack ? 'paystack' : config.data.bankTransfer ? 'bank_transfer' : null);
  }, [config.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartRows = rows.status === 'ready' ? rows.data : [];
  const hasPhysical = cartRows.some((r) => r.product?.type === 'physical');
  const availableZones = useMemo(() => (zones.status === 'ready' ? zones.data : []).filter((z) => !z.requires_address || z.states.length === 0 || z.states.includes(addr.state)), [zones, addr.state]);
  const zone: Zone | undefined = availableZones.find((z) => z.id === zoneId);
  useEffect(() => { if (zoneId && !availableZones.some((z) => z.id === zoneId)) setZoneId(null); }, [availableZones, zoneId]);

  // Server quote: the price customers pay
  useEffect(() => {
    if (!lines.length || (hasPhysical && !zoneId)) { setQ({ status: 'idle' }); return; }
    let live = true;
    setQ((p) => ({ ...p, status: 'loading' }));
    quote(lines, hasPhysical ? zoneId : null, coupon)
      .then((d) => live && setQ({ status: 'ok', data: d }))
      .catch((e) => {
        if (!live) return;
        const msg = cartErrorMessage(e?.message ?? '');
        if (coupon && /coupon|COUPON/.test(e?.message ?? '')) { setCoupon(null); setErrors((x) => ({ ...x, coupon: msg })); }
        setQ({ status: 'error', message: msg });
      });
    return () => { live = false; };
  }, [key, zoneId, coupon, hasPhysical]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lines.length) return <Navigate to="/cart" replace />;

  const subtotalEstimate = cartRows.reduce((s, r) => s + r.unitKobo * r.line.quantity, 0);
  const needsAddress = hasPhysical && (zone?.requires_address ?? true);
  const noPayment = config.status === 'ready' && !config.data.paystack && !config.data.bankTransfer;

  const whatsappOrder = () => whatsappHref([
    'Hello Zetalogic, I would like to order:',
    ...cartRows.filter((r) => r.product).map((r) => `• ${r.line.quantity} × ${r.product!.name}${r.variantName ? ` (${r.variantName})` : ''}`),
    `Name: ${contact.fullName}`, `Phone: ${contact.phone}`,
    hasPhysical ? `Delivery: ${zone?.name ?? 'to be agreed'}${needsAddress && addr.line1 ? `, ${addr.line1}, ${addr.city}, ${addr.state}` : ''}` : '',
  ].filter(Boolean).join('\n'));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (contact.fullName.trim().length < 2) errs.fullName = 'Enter your full name.';
    if (!isEmail(contact.email)) errs.email = 'Enter an email address for your receipt.';
    if (!isNigerianPhone(contact.phone)) errs.phone = 'Enter a Nigerian number like 0802 123 4567.';
    if (hasPhysical && !zoneId) errs.zone = 'Choose how you want to receive your order.';
    if (needsAddress) {
      if (addr.line1.trim().length < 3) errs.line1 = 'Enter the street address.';
      if (addr.city.trim().length < 2) errs.city = 'Enter the town or city.';
    }
    if (!method) errs.method = 'Choose a payment method.';
    setErrors(errs);
    if (Object.keys(errs).length) { document.getElementById(`co-${Object.keys(errs)[0]}`)?.focus(); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const base = window.location.origin + (import.meta.env.VITE_ROUTER === 'hash' ? window.location.pathname + '#' : '');
      const res = await callFunction<{ orderNumber: string; token: string; authorizationUrl?: string; error?: string }>('checkout', { body: {
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity })),
        contact, address: needsAddress ? addr : {}, zoneId: hasPhysical ? zoneId : null, couponCode: coupon,
        paymentMethod: method, note, saveAddress: !!user && needsAddress && saveAddress,
        returnUrl: `${base}/checkout/complete`,
      } });
      clear();
      if (res.authorizationUrl) { window.location.assign(res.authorizationUrl); return; }
      navigate(`/orders/${res.orderNumber}?token=${res.token}&placed=1`, { replace: true });
    } catch (err) {
      const body = (err as ApiError).body ?? {};
      if (body.orderNumber && body.token) { clear(); navigate(`/orders/${body.orderNumber}?token=${body.token}`, { replace: true }); return; }
      if (body.fields) setErrors(body.fields as Record<string, string>);
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link to="/cart" className="hover:text-ink">Cart</Link> / <span className="text-ink">Checkout</span></nav>
      <h1 className="mt-2 text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold tracking-tight text-ink">Checkout</h1>
      {!user && <p className="mt-2 text-muted">Checking out as a guest. <Link to="/account/sign-in?next=/checkout" className="font-semibold text-brand-deep underline">Sign in</Link> to use saved addresses and see this order in your account.</p>}

      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Section n={1} title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-fullName" label="Full name" error={errors.fullName}><input id="co-fullName" autoComplete="name" value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} className={input} aria-invalid={!!errors.fullName} /></Field>
              <Field id="co-phone" label="Phone number" error={errors.phone}><input id="co-phone" type="tel" autoComplete="tel" placeholder="0802 123 4567" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={input} aria-invalid={!!errors.phone} /></Field>
              <div className="sm:col-span-2"><Field id="co-email" label="Email for your receipt" error={errors.email}><input id="co-email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={input} aria-invalid={!!errors.email} /></Field></div>
            </div>
          </Section>

          {hasPhysical && (
            <Section n={2} title="Delivery">
              <Field id="co-state" label="Your state">
                <select id="co-state" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} className={input}>
                  {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <fieldset className="mt-5">
                <legend className="mb-2 text-[0.88rem] font-semibold text-ink">How do you want to receive it?</legend>
                {zones.status === 'loading' ? <p className="text-sm text-muted">Loading delivery options…</p> : availableZones.length === 0 ? (
                  <p className="rounded-btn bg-paper-grey p-4 text-sm text-muted">We don’t have a delivery option for {addr.state} online yet. <a href={whatsappOrder()} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-deep underline">Order on WhatsApp</a> and we’ll arrange delivery.</p>
                ) : (
                  <div className="grid gap-2">
                    {availableZones.map((z) => (
                      <label key={z.id} className={`flex cursor-pointer items-start gap-3 rounded-btn border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${zoneId === z.id ? 'border-ink bg-paper-grey' : 'border-paper-line hover:border-ink/40'}`}>
                        <input id={zoneId === null && z === availableZones[0] ? 'co-zone' : undefined} type="radio" name="zone" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="mt-1 accent-[#101010]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex justify-between gap-3 font-semibold text-ink"><span>{z.name}</span><span className="tabular-nums">{z.fee_kobo === 0 ? 'Free' : formatNaira(z.fee_kobo)}</span></span>
                          {z.description && <span className="block text-sm text-muted">{z.description}</span>}
                          {z.eta && <span className="block text-xs text-muted">{z.eta}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.zone && <p className="mt-1 text-[0.82rem] text-[#B42318]">{errors.zone}</p>}
              </fieldset>

              {needsAddress && zoneId && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {saved.status === 'ready' && saved.data.length > 0 && (
                    <div className="sm:col-span-2">
                      <label htmlFor="co-saved" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">Saved addresses</label>
                      <select id="co-saved" className={input} onChange={(e) => { const a = saved.data.find((x) => x.id === e.target.value); if (a) { setAddr({ line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, landmark: a.landmark ?? '' }); setSaveAddress(false); } }}>
                        {saved.data.map((a) => <option key={a.id} value={a.id}>{a.line1}, {a.city}, {a.state}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="sm:col-span-2"><Field id="co-line1" label="Street address" error={errors.line1}><input id="co-line1" autoComplete="address-line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} className={input} aria-invalid={!!errors.line1} /></Field></div>
                  <div className="sm:col-span-2"><Field id="co-line2" label="Apartment, floor, estate" optional><input id="co-line2" autoComplete="address-line2" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} className={input} /></Field></div>
                  <Field id="co-city" label="Town or city" error={errors.city}><input id="co-city" autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className={input} aria-invalid={!!errors.city} /></Field>
                  <Field id="co-landmark" label="Nearest landmark" optional><input id="co-landmark" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} className={input} /></Field>
                  {user && <label className="flex items-center gap-2.5 text-sm sm:col-span-2"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-[#4CB748]" />Save this address to my account</label>}
                </div>
              )}
            </Section>
          )}

          <Section n={hasPhysical ? 3 : 2} title="Payment">
            {config.status === 'loading' ? <p className="text-sm text-muted">Loading payment options…</p>
              : config.status === 'error' ? <p role="alert" className="text-sm text-muted">{config.message}</p>
              : noPayment ? (
                <div className="rounded-btn bg-paper-grey p-4">
                  <p className="font-semibold text-ink">Online payment opens soon.</p>
                  <p className="mt-1 text-sm text-muted">Send this order to us on WhatsApp and we’ll confirm stock, delivery and how to pay.</p>
                  <ButtonA href={whatsappOrder()} className="mt-4"><MessageCircle className="h-4 w-4" aria-hidden="true" />Send order on WhatsApp</ButtonA>
                </div>
              ) : (
                <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
                  {config.data.paystack && (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-btn border p-4 ${method === 'paystack' ? 'border-ink bg-paper-grey' : 'border-paper-line hover:border-ink/40'}`}>
                      <input id="co-method" type="radio" name="method" checked={method === 'paystack'} onChange={() => setMethod('paystack')} className="mt-1 accent-[#101010]" />
                      <span><span className="flex items-center gap-2 font-semibold text-ink"><CreditCard className="h-4 w-4" aria-hidden="true" />Pay online with Paystack</span><span className="block text-sm text-muted">Card, bank transfer, USSD or bank app. You’ll be taken to Paystack’s secure page.</span></span>
                    </label>
                  )}
                  {config.data.bankTransfer && (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-btn border p-4 ${method === 'bank_transfer' ? 'border-ink bg-paper-grey' : 'border-paper-line hover:border-ink/40'}`}>
                      <input id={config.data.paystack ? undefined : 'co-method'} type="radio" name="method" checked={method === 'bank_transfer'} onChange={() => setMethod('bank_transfer')} className="mt-1 accent-[#101010]" />
                      <span><span className="flex items-center gap-2 font-semibold text-ink"><Landmark className="h-4 w-4" aria-hidden="true" />Direct bank transfer</span><span className="block text-sm text-muted">Transfer to our account after placing the order. We confirm payment before dispatch.</span></span>
                    </label>
                  )}
                  {errors.method && <p className="text-[0.82rem] text-[#B42318]">{errors.method}</p>}
                </div>
              )}
            <div className="mt-5"><Field id="co-note" label="Note for us" optional><textarea id="co-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder="Delivery instructions, preferred time…" /></Field></div>
          </Section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-36">
          <div className="rounded-card border border-paper-line bg-paper-grey p-6">
            <h2 className="font-bold text-ink">Order summary</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {cartRows.map((r) => r.product && (
                <li key={`${r.line.productId}-${r.line.variantId ?? ''}`} className="flex justify-between gap-3">
                  <span className="min-w-0 text-ink/85"><span className="tabular-nums">{r.line.quantity} ×</span> {r.product.name}{r.variantName && <span className="text-muted"> · {r.variantName}</span>}</span>
                  <span className="shrink-0 tabular-nums">{formatNaira(r.unitKobo * r.line.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-paper-line pt-4">
              {coupon ? (
                <p className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-1.5 font-semibold"><Tag className="h-4 w-4 text-brand-deep" />{coupon}</span><button type="button" onClick={() => setCoupon(null)} className="text-muted underline">Remove</button></p>
              ) : (
                <div className="flex gap-2">
                  <label htmlFor="co-coupon" className="sr-only">Discount code</label>
                  <input id="co-coupon" value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setErrors((x) => ({ ...x, coupon: '' })); }} placeholder="Discount code" className="h-10 min-w-0 flex-1 rounded-btn border border-paper-line bg-white px-3 text-sm uppercase" />
                  <button type="button" onClick={() => couponInput.trim() && setCoupon(couponInput.trim())} className="h-10 rounded-btn border border-ink/15 bg-white px-3 text-sm font-semibold">Apply</button>
                </div>
              )}
              {errors.coupon && <p className="mt-1 text-[0.82rem] text-[#B42318]">{errors.coupon}</p>}
            </div>
            <dl className="mt-4 space-y-2 border-t border-paper-line pt-4 text-[0.95rem]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatNaira(q.data?.subtotal_kobo ?? subtotalEstimate)}</dd></div>
              {!!q.data?.discount_kobo && <div className="flex justify-between text-brand-deep"><dt>Discount</dt><dd className="tabular-nums">−{formatNaira(q.data.discount_kobo)}</dd></div>}
              {hasPhysical && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{zoneId && q.data ? (q.data.delivery_fee_kobo === 0 ? 'Free' : formatNaira(q.data.delivery_fee_kobo)) : 'Choose an option'}</dd></div>}
              <div className="flex justify-between border-t border-paper-line pt-3 text-lg font-extrabold"><dt>Total</dt><dd className="tabular-nums" aria-live="polite">{q.data ? formatNaira(q.data.total_kobo) : '—'}</dd></div>
            </dl>
            {q.status === 'error' && <p role="alert" className="mt-3 text-sm text-[#B42318]">{q.message} <Link to="/cart" className="underline">Edit cart</Link></p>}
          </div>
          {!noPayment && (
            <>
              <Button type="submit" disabled={submitting || q.status !== 'ok'} className="w-full !py-4 text-base">
                <Lock className="h-4 w-4" aria-hidden="true" />{submitting ? 'Placing order…' : method === 'bank_transfer' ? 'Place order' : `Pay ${q.data ? formatNaira(q.data.total_kobo) : ''}`}
              </Button>
              {submitError && <p role="alert" className="text-sm text-[#B42318]">{submitError}</p>}
              <p className="text-xs text-muted">By placing this order you agree to our <Link to="/policies/terms" className="underline">terms</Link> and <Link to="/policies/returns" className="underline">returns policy</Link>.</p>
            </>
          )}
        </aside>
      </form>
    </Container>
  );
}
