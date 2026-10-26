import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import { Button } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { AdminCard, AdminField, PageTitle, adminInput as input, can, nairaToKobo } from './AdminLayout';
import { useAsync } from '../../data/useAsync';
import { requireSupabase, friendlyError } from '../../lib/supabase';
import { formatNaira } from '../../lib/money';
import { usePageMeta } from '../../lib/seo';
import { useAuth } from '../../context/AuthContext';
import { fulfilmentLabel, paymentLabel } from '../checkout/OrderPages';

type OrderRow = {
  id: string; order_number: string; full_name: string; email: string; phone: string; created_at: string; total_kobo: number;
  payment_method: string; payment_status: string; fulfilment_status: string; needs_attention: boolean; delivery_method: string | null;
};
const fmt = (d: string) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function AdminOrders() {
  usePageMeta('Orders · Admin', 'Manage orders.');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'open' | 'awaiting' | 'all' | 'attention'>('open');
  const data = useAsync<OrderRow[]>(async () => {
    const { data, error } = await requireSupabase().from('orders')
      .select('id, order_number, full_name, email, phone, created_at, total_kobo, payment_method, payment_status, fulfilment_status, needs_attention, delivery_method')
      .order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  }, []);
  const rows = useMemo(() => {
    if (data.status !== 'ready') return [];
    const t = q.trim().toLowerCase();
    return data.data.filter((o) => {
      if (t && !`${o.order_number} ${o.full_name} ${o.email} ${o.phone}`.toLowerCase().includes(t)) return false;
      if (filter === 'open') return o.payment_status === 'paid' && !['delivered', 'cancelled'].includes(o.fulfilment_status);
      if (filter === 'awaiting') return ['unpaid', 'awaiting_transfer', 'failed'].includes(o.payment_status) && o.fulfilment_status !== 'cancelled';
      if (filter === 'attention') return o.needs_attention;
      return true;
    });
  }, [data, q, filter]);
  const tabs = [{ id: 'open', label: 'To fulfil' }, { id: 'awaiting', label: 'Awaiting payment' }, { id: 'attention', label: 'Needs attention' }, { id: 'all', label: 'All' }] as const;

  return (
    <>
      <PageTitle title="Orders" intro="Paid orders to fulfil, payments to confirm, and order history." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="ao-search" className="sr-only">Search orders</label>
          <input id="ao-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, name, email or phone" className="h-10 w-full rounded-btn border border-paper-line bg-white pl-9 pr-3 text-sm" />
        </div>
        <div className="no-scrollbar flex overflow-x-auto rounded-btn border border-paper-line bg-white p-1 text-sm" role="tablist" aria-label="Order filter">
          {tabs.map((t) => <button key={t.id} role="tab" aria-selected={filter === t.id} onClick={() => setFilter(t.id)} className={`whitespace-nowrap rounded-[7px] px-3 py-1.5 font-semibold ${filter === t.id ? 'bg-ink text-white' : 'text-ink/70'}`}>{t.label}</button>)}
        </div>
      </div>
      <div className="overflow-x-auto rounded-card border border-paper-line bg-white">
        {data.status === 'loading' ? <p className="p-6 text-muted" aria-busy="true">Loading orders…</p>
          : data.status === 'error' ? <p role="alert" className="p-6 text-muted">{data.message}</p>
          : rows.length === 0 ? <p className="p-10 text-center text-muted">{data.data.length ? 'No orders in this view.' : 'No orders yet. They’ll appear here as customers check out.'}</p>
          : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-paper-line bg-paper-grey text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-3 font-semibold">Order</th><th className="p-3 font-semibold">Customer</th><th className="p-3 font-semibold">Payment</th><th className="p-3 font-semibold">Fulfilment</th><th className="p-3 text-right font-semibold">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-paper-grey/60">
                    <td className="p-3"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-ink hover:underline">{o.order_number}</Link>{o.needs_attention && <AlertTriangle className="ml-1.5 inline h-4 w-4 text-[#B54708]" aria-label="Needs attention" />}<span className="block text-xs text-muted">{fmt(o.created_at)}</span></td>
                    <td className="p-3">{o.full_name}<span className="block text-xs text-muted">{o.phone}</span></td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paymentLabel[o.payment_status]?.tone}`}>{paymentLabel[o.payment_status]?.text}</span><span className="block pt-1 text-xs text-muted">{o.payment_method === 'paystack' ? 'Paystack' : 'Bank transfer'}</span></td>
                    <td className="p-3">{fulfilmentLabel[o.fulfilment_status]}<span className="block text-xs text-muted">{o.delivery_method ?? 'Digital'}</span></td>
                    <td className="p-3 text-right font-semibold tabular-nums">{formatNaira(o.total_kobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </>
  );
}

type Detail = OrderRow & {
  access_token: string; ship_line1: string | null; ship_line2: string | null; ship_city: string | null; ship_state: string | null; ship_landmark: string | null;
  subtotal_kobo: number; discount_kobo: number; delivery_fee_kobo: number; coupon_code: string | null; customer_note: string | null; staff_note: string | null;
  carrier: string | null; tracking_number: string | null; paid_at: string | null;
  order_items: { id: string; product_name: string; variant_name: string | null; sku: string; quantity: number; unit_price_kobo: number; line_total_kobo: number; product_id: string | null }[];
  order_events: { id: number; title: string; detail: string | null; customer_visible: boolean; created_at: string }[];
  payment_transactions: { reference: string; provider: string; status: string; amount_kobo: number; channel: string | null; created_at: string }[];
  refunds: { amount_kobo: number; reason: string; created_at: string }[];
};

export function AdminOrderDetail() {
  const { id = '' } = useParams();
  usePageMeta('Order · Admin', 'Order details.');
  const { roles } = useAuth();
  const toast = useToast();
  const sb = requireSupabase();
  const [o, setO] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ful, setFul] = useState({ status: 'processing', carrier: '', tracking: '', note: '' });
  const [transferAmt, setTransferAmt] = useState('');
  const [refund, setRefund] = useState({ amount: '', reason: '', restock: false });
  const [staffNote, setStaffNote] = useState('');
  const [busy, setBusy] = useState(false);
  const canEdit = can.orders(roles);

  const load = async () => {
    const { data, error } = await sb.from('orders').select('*, order_items(*), order_events(*), payment_transactions(reference, provider, status, amount_kobo, channel, created_at), refunds(amount_kobo, reason, created_at)').eq('id', id).single();
    if (error) { setError(friendlyError(error, 'This order could not be loaded.')); return; }
    const d = data as Detail;
    d.order_events.sort((a, b) => a.id - b.id);
    setO(d); setStaffNote(d.staff_note ?? ''); setTransferAmt(String(d.total_kobo / 100));
    setFul((f) => ({ ...f, status: d.fulfilment_status === 'unfulfilled' ? 'processing' : d.fulfilment_status, carrier: d.carrier ?? '', tracking: d.tracking_number ?? '' }));
  };
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>, ok: string) => {
    setBusy(true);
    const { error, data } = await fn();
    setBusy(false);
    if (error) {
      const m: Record<string, string> = { NOT_PAID: 'The order must be paid first.', ALREADY_SHIPPED: 'Shipped orders can’t be cancelled. Record a refund instead.', BAD_AMOUNT: 'Refund amount is more than what’s left to refund.', FORBIDDEN: 'Your role can’t do that.' };
      toast(m[error.message] ?? friendlyError(error, 'That didn’t work. Try again.'));
      return false;
    }
    toast(data === 'amount_mismatch' ? 'Amount doesn’t match the order total. The order is flagged for review.' : ok);
    void load();
    return true;
  };

  if (error) return <p role="alert" className="text-muted">{error} <Link to="/admin/orders" className="underline">Back to orders</Link></p>;
  if (!o) return <p className="text-muted" aria-busy="true">Loading order…</p>;

  const refunded = o.refunds.reduce((s, r) => s + r.amount_kobo, 0);
  return (
    <>
      <PageTitle title={`Order ${o.order_number}`} intro={`${fmt(o.created_at)} · ${o.payment_method === 'paystack' ? 'Paystack' : 'Bank transfer'}`}
        action={<a href={`/orders/${o.order_number}?token=${o.access_token}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-deep hover:underline">Customer’s view</a>} />
      {o.needs_attention && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-card border border-[#F5C26B] bg-[#FFF8EB] p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-[#B54708]" aria-hidden="true" /><span className="flex-1">This order needs attention. Check the timeline for details.</span>
          {canEdit && <button onClick={() => void run(() => sb.from('orders').update({ needs_attention: false }).eq('id', o.id), 'Marked as resolved')} className="font-semibold text-ink underline">Mark resolved</button>}
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <AdminCard title="Items">
            <ul className="divide-y divide-paper-line">
              {o.order_items.map((it) => (
                <li key={it.id} className="flex justify-between gap-4 py-2.5 text-sm">
                  <span>{it.quantity} × {it.product_id ? <Link to={`/admin/products/${it.product_id}`} className="font-semibold hover:underline">{it.product_name}</Link> : it.product_name}{it.variant_name && <span className="text-muted"> · {it.variant_name}</span>}<span className="block text-xs text-muted">SKU {it.sku} · {formatNaira(it.unit_price_kobo)} each</span></span>
                  <span className="tabular-nums">{formatNaira(it.line_total_kobo)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-paper-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatNaira(o.subtotal_kobo)}</dd></div>
              {o.discount_kobo > 0 && <div className="flex justify-between"><dt className="text-muted">Discount ({o.coupon_code})</dt><dd className="tabular-nums">−{formatNaira(o.discount_kobo)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">{o.delivery_method ?? 'Delivery'}</dt><dd className="tabular-nums">{formatNaira(o.delivery_fee_kobo)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(o.total_kobo)}</dd></div>
              {refunded > 0 && <div className="flex justify-between text-[#B42318]"><dt>Refunded</dt><dd className="tabular-nums">−{formatNaira(refunded)}</dd></div>}
            </dl>
          </AdminCard>

          <AdminCard title="Timeline">
            <ol className="space-y-3 border-l-2 border-paper-line pl-4">
              {o.order_events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ${e.customer_visible ? 'bg-brand' : 'bg-[#B54708]'}`} aria-hidden="true" />
                  <p className="font-semibold text-ink">{e.title}{!e.customer_visible && <span className="ml-2 rounded bg-[#FFF4D6] px-1.5 text-xs text-[#B54708]">Staff only</span>}</p>
                  {e.detail && <p className="text-muted">{e.detail}</p>}
                  <p className="text-xs text-muted">{fmt(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </AdminCard>

          {o.payment_transactions.length > 0 && (
            <AdminCard title="Payment attempts">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1.5">Reference</th><th>Status</th><th>Channel</th><th className="text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-paper-line">{o.payment_transactions.map((t) => <tr key={t.reference}><td className="py-2 font-mono text-xs">{t.reference}</td><td className="capitalize">{t.status.replace('_', ' ')}</td><td>{t.channel ?? '—'}</td><td className="text-right tabular-nums">{formatNaira(t.amount_kobo)}</td></tr>)}</tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </div>

        <aside className="space-y-5">
          <AdminCard title="Customer">
            <p className="text-sm">{o.full_name}<br /><a href={`tel:${o.phone}`} className="text-brand-deep underline">{o.phone}</a><br /><a href={`mailto:${o.email}`} className="break-all text-brand-deep underline">{o.email}</a></p>
            {o.ship_line1 && <p className="mt-3 text-sm">{o.ship_line1}{o.ship_line2 ? `, ${o.ship_line2}` : ''}<br />{o.ship_city}, {o.ship_state}{o.ship_landmark && <><br />Landmark: {o.ship_landmark}</>}</p>}
            {o.customer_note && <p className="mt-3 rounded-btn bg-paper-grey p-3 text-sm"><strong>Note:</strong> {o.customer_note}</p>}
          </AdminCard>

          {canEdit && o.payment_method === 'bank_transfer' && o.payment_status === 'awaiting_transfer' && (
            <AdminCard title="Confirm bank transfer" className="border-brand">
              <p className="mb-3 text-sm text-muted">Only confirm after the money shows in your bank account. This marks the order paid and deducts stock.</p>
              <AdminField id="ao-amt" label="Amount received (₦)"><input id="ao-amt" inputMode="decimal" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} className={input} /></AdminField>
              <Button className="mt-3 w-full" disabled={busy} onClick={() => { const k = nairaToKobo(transferAmt); if (!k || Number.isNaN(k)) { toast('Enter the amount received.'); return; } void run(() => sb.rpc('admin_confirm_transfer', { p_order_id: o.id, p_amount_kobo: k, p_note: null }), 'Payment confirmed'); }}>Confirm payment received</Button>
            </AdminCard>
          )}

          {canEdit && o.fulfilment_status !== 'cancelled' && (
            <AdminCard title="Update fulfilment">
              <div className="grid gap-3">
                <AdminField id="ao-fs" label="Status">
                  <select id="ao-fs" value={ful.status} onChange={(e) => setFul({ ...ful, status: e.target.value })} className={input}>
                    <option value="processing">Preparing</option><option value="ready_for_pickup">Ready for pickup</option><option value="shipped">On the way (shipped)</option><option value="delivered">Delivered</option><option value="cancelled">Cancel order</option>
                  </select>
                </AdminField>
                {ful.status === 'shipped' && <>
                  <AdminField id="ao-car" label="Courier"><input id="ao-car" value={ful.carrier} onChange={(e) => setFul({ ...ful, carrier: e.target.value })} className={input} placeholder="e.g. GIG Logistics" /></AdminField>
                  <AdminField id="ao-trk" label="Tracking number"><input id="ao-trk" value={ful.tracking} onChange={(e) => setFul({ ...ful, tracking: e.target.value })} className={input} /></AdminField>
                </>}
                <AdminField id="ao-note" label="Message to customer" hint="Shown on their order page."><input id="ao-note" value={ful.note} onChange={(e) => setFul({ ...ful, note: e.target.value })} className={input} /></AdminField>
                {ful.status === 'cancelled' && o.payment_status === 'paid' && <p className="text-xs text-[#B54708]">Cancelling returns the items to stock. Refund the customer in Paystack, then record the refund below.</p>}
                <Button disabled={busy} onClick={() => void run(() => sb.rpc('admin_update_fulfilment', { p_order_id: o.id, p_status: ful.status, p_carrier: ful.carrier, p_tracking: ful.tracking, p_note: ful.note }), 'Order updated')}>Save status</Button>
              </div>
            </AdminCard>
          )}

          {canEdit && ['paid', 'partially_refunded'].includes(o.payment_status) && (
            <AdminCard title="Record a refund">
              <p className="mb-3 text-sm text-muted">Send the money back in your Paystack dashboard (or by transfer) first, then record it here.</p>
              <div className="grid gap-3">
                <AdminField id="ao-ra" label="Amount (₦)"><input id="ao-ra" inputMode="decimal" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} className={input} placeholder={String((o.total_kobo - refunded) / 100)} /></AdminField>
                <AdminField id="ao-rr" label="Reason"><input id="ao-rr" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} className={input} /></AdminField>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refund.restock} onChange={(e) => setRefund({ ...refund, restock: e.target.checked })} className="accent-[#4CB748]" />Items came back: return them to stock</label>
                <Button variant="outline" disabled={busy} onClick={() => { const k = nairaToKobo(refund.amount); if (!k || Number.isNaN(k) || refund.reason.trim().length < 3) { toast('Enter the amount and a reason.'); return; } void run(() => sb.rpc('admin_record_refund', { p_order_id: o.id, p_amount_kobo: k, p_reason: refund.reason.trim(), p_restock: refund.restock }), 'Refund recorded').then((ok) => ok && setRefund({ amount: '', reason: '', restock: false })); }}>Record refund</Button>
              </div>
            </AdminCard>
          )}

          {canEdit && (
            <AdminCard title="Staff note">
              <label htmlFor="ao-sn" className="sr-only">Staff note</label>
              <textarea id="ao-sn" rows={3} value={staffNote} onChange={(e) => setStaffNote(e.target.value)} className={input} placeholder="Only staff can see this." />
              <Button variant="outline" className="mt-2" disabled={busy} onClick={() => void run(() => sb.from('orders').update({ staff_note: staffNote.trim() || null }).eq('id', o.id), 'Note saved')}>Save note</Button>
            </AdminCard>
          )}
        </aside>
      </div>
    </>
  );
}
