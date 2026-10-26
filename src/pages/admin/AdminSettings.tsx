import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, ShoppingCart, Plus } from 'lucide-react';
import { Button, ButtonLink } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { AdminCard, AdminField, PageTitle, adminInput as input, can, koboToNaira, nairaToKobo } from './AdminLayout';
import { requireSupabase, friendlyError } from '../../lib/supabase';
import { formatNaira } from '../../lib/money';
import { useAsync } from '../../data/useAsync';
import { usePageMeta } from '../../lib/seo';
import { useAuth } from '../../context/AuthContext';
import { NIGERIAN_STATES } from '../account/Account';

/* ---------------- Overview ---------------- */
export function AdminDashboard() {
  usePageMeta('Admin', 'Store overview.');
  const { roles } = useAuth();
  const sb = requireSupabase();
  const data = useAsync(async () => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [products, orders, lowStock, zones, bank] = await Promise.all([
      can.products(roles) ? sb.from('products').select('status') : Promise.resolve({ data: [] as { status: string }[] }),
      can.viewOrders(roles) ? sb.from('orders').select('payment_status, fulfilment_status, total_kobo, needs_attention, paid_at').gte('created_at', since) : Promise.resolve({ data: [] as never[] }),
      can.products(roles) ? sb.from('catalog_products').select('id, name, stock_total, low_stock_threshold').not('stock_total', 'is', null) : Promise.resolve({ data: [] as never[] }),
      sb.from('shipping_zones').select('is_active, fee_kobo, requires_address'),
      sb.from('store_settings').select('value').eq('key', 'bank_transfer').maybeSingle(),
    ]);
    const o = (orders.data ?? []) as { payment_status: string; fulfilment_status: string; total_kobo: number; needs_attention: boolean; paid_at: string | null }[];
    return {
      published: (products.data ?? []).filter((p) => p.status === 'published').length,
      drafts: (products.data ?? []).filter((p) => p.status === 'draft').length,
      toFulfil: o.filter((x) => x.payment_status === 'paid' && !['delivered', 'cancelled'].includes(x.fulfilment_status)).length,
      awaiting: o.filter((x) => ['awaiting_transfer', 'unpaid'].includes(x.payment_status) && x.fulfilment_status !== 'cancelled').length,
      attention: o.filter((x) => x.needs_attention).length,
      paidRevenue: o.filter((x) => x.payment_status === 'paid').reduce((s, x) => s + x.total_kobo, 0),
      low: ((lowStock.data ?? []) as { id: string; name: string; stock_total: number; low_stock_threshold: number }[]).filter((p) => p.stock_total <= p.low_stock_threshold),
      deliveryReady: ((zones.data ?? []) as { is_active: boolean; requires_address: boolean }[]).some((z) => z.is_active && z.requires_address),
      bankReady: !!(bank.data?.value as { enabled?: boolean } | undefined)?.enabled,
    };
  }, [roles.join(',')]);

  if (data.status !== 'ready') return <p className="text-muted" aria-busy="true">{data.status === 'error' ? data.message : 'Loading…'}</p>;
  const d = data.data;
  const tile = (label: string, value: string | number, to?: string) => (
    <Link to={to ?? '#'} className="rounded-card border border-paper-line bg-white p-5 hover:border-ink/30">
      <p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
    </Link>
  );
  return (
    <>
      <PageTitle title="Overview" intro="What needs doing today." action={can.products(roles) ? <ButtonLink to="/admin/products/new"><Plus className="h-4 w-4" />Add product</ButtonLink> : undefined} />
      {(!d.deliveryReady || !d.bankReady) && can.settings(roles) && (
        <div className="mb-5 rounded-card border border-[#F5C26B] bg-[#FFF8EB] p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-[#B54708]" />Finish setting up checkout</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-ink/80">
            {!d.deliveryReady && <li>Delivery is pickup-only. <Link to="/admin/settings" className="underline">Set delivery fees</Link> to offer delivery.</li>}
            {!d.bankReady && <li>Bank transfer is off. <Link to="/admin/settings" className="underline">Add your bank details</Link> to accept transfers.</li>}
            <li>Online card payments start once the Paystack secret key is added (see setup notes).</li>
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can.viewOrders(roles) && tile('Orders to fulfil', d.toFulfil, '/admin/orders')}
        {can.viewOrders(roles) && tile('Awaiting payment', d.awaiting, '/admin/orders')}
        {can.viewOrders(roles) && tile('Paid sales, last 30 days', formatNaira(d.paidRevenue))}
        {can.products(roles) && tile('Products live', `${d.published}${d.drafts ? ` (+${d.drafts} draft)` : ''}`, '/admin/products')}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {can.viewOrders(roles) && d.attention > 0 && (
          <AdminCard title="Needs attention"><p className="flex items-center gap-2 text-sm"><ShoppingCart className="h-4 w-4 text-[#B54708]" />{d.attention} order{d.attention === 1 ? '' : 's'} flagged. <Link to="/admin/orders" className="font-semibold underline">Review</Link></p></AdminCard>
        )}
        {can.products(roles) && (
          <AdminCard title="Low stock">
            {d.low.length === 0 ? <p className="text-sm text-muted">Nothing is running low.</p> : (
              <ul className="divide-y divide-paper-line text-sm">{d.low.map((p) => <li key={p.id} className="flex justify-between py-2"><Link to={`/admin/products/${p.id}`} className="flex items-center gap-2 hover:underline"><Package className="h-4 w-4 text-muted" />{p.name}</Link><span className="font-bold tabular-nums text-[#B42318]">{p.stock_total} left</span></li>)}</ul>
            )}
          </AdminCard>
        )}
      </div>
    </>
  );
}

/* ---------------- Settings ---------------- */
type ZoneRow = { id: string; name: string; description: string | null; states: string[]; fee_kobo: number; eta: string | null; requires_address: boolean; is_active: boolean; sort_order: number };
type Coupon = { id: string; code: string; kind: 'percent' | 'fixed'; value: number; min_order_kobo: number; ends_at: string | null; max_uses: number | null; used_count: number; is_active: boolean };

export function AdminSettings() {
  usePageMeta('Settings · Admin', 'Store settings.');
  const toast = useToast();
  const sb = requireSupabase();
  const [zones, setZones] = useState<(ZoneRow & { feeText: string; dirty?: boolean })[]>([]);
  const [bank, setBank] = useState({ enabled: false, bank_name: '', account_name: '', account_number: '' });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', kind: 'percent' as 'percent' | 'fixed', value: '', min: '', ends: '', max: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [z, b, c] = await Promise.all([
      sb.from('shipping_zones').select('*').order('sort_order'),
      sb.from('store_settings').select('value').eq('key', 'bank_transfer').maybeSingle(),
      sb.from('coupons').select('*').order('created_at', { ascending: false }),
    ]);
    setZones(((z.data ?? []) as ZoneRow[]).map((x) => ({ ...x, feeText: koboToNaira(x.fee_kobo) })));
    if (b.data?.value) setBank(b.data.value as typeof bank);
    setCoupons((c.data ?? []) as Coupon[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveZone = async (z: (typeof zones)[number]) => {
    const fee = nairaToKobo(z.feeText || '0');
    if (fee === null || Number.isNaN(fee)) { toast('Enter the fee in naira, e.g. 3500.'); return; }
    const { error } = await sb.from('shipping_zones').update({ name: z.name.trim(), description: z.description?.trim() || null, states: z.states, fee_kobo: fee, eta: z.eta?.trim() || null, is_active: z.is_active }).eq('id', z.id);
    if (error) toast(friendlyError(error, 'Couldn’t save.')); else { toast(`${z.name} saved`); void load(); }
  };
  const addZone = async () => {
    const { error } = await sb.from('shipping_zones').insert({ name: 'New delivery option', states: [], fee_kobo: 0, requires_address: true, is_active: false, sort_order: zones.length });
    if (error) toast(friendlyError(error, 'Couldn’t add.')); else void load();
  };
  const saveBank = async () => {
    if (bank.enabled && (!bank.bank_name.trim() || !bank.account_name.trim() || !/^\d{10}$/.test(bank.account_number.trim()))) { toast('Enter the bank name, account name and 10-digit account number.'); return; }
    const { error } = await sb.from('store_settings').upsert({ key: 'bank_transfer', value: { ...bank, account_number: bank.account_number.trim() }, is_public: true });
    if (error) toast(friendlyError(error, 'Couldn’t save.')); else toast('Bank transfer settings saved');
  };
  const addCoupon = async () => {
    const code = newCoupon.code.trim().toUpperCase();
    const value = newCoupon.kind === 'percent' ? Number(newCoupon.value) : nairaToKobo(newCoupon.value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) { toast('Code: 3–30 letters, numbers, dashes.'); return; }
    if (!value || Number.isNaN(value) || (newCoupon.kind === 'percent' && (value < 1 || value > 100))) { toast(newCoupon.kind === 'percent' ? 'Percent must be 1–100.' : 'Enter the discount in naira.'); return; }
    const { error } = await sb.from('coupons').insert({
      code, kind: newCoupon.kind, value, min_order_kobo: nairaToKobo(newCoupon.min) ?? 0,
      ends_at: newCoupon.ends ? new Date(`${newCoupon.ends}T23:59:59+01:00`).toISOString() : null, max_uses: newCoupon.max ? Number(newCoupon.max) : null,
    });
    if (error) toast(error.code === '23505' ? 'That code already exists.' : friendlyError(error, 'Couldn’t create the code.'));
    else { toast(`Code ${code} created`); setNewCoupon({ code: '', kind: 'percent', value: '', min: '', ends: '', max: '' }); void load(); }
  };

  if (loading) return <p className="text-muted" aria-busy="true">Loading…</p>;
  return (
    <>
      <PageTitle title="Store settings" intro="Delivery fees, bank transfer details and discount codes." />
      <div className="space-y-5">
        <AdminCard title="Delivery options" action={<button onClick={() => void addZone()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep"><Plus className="h-4 w-4" />Add option</button>}>
          <p className="mb-4 text-sm text-muted">Customers see active options that cover their state. Leave states empty to cover all of Nigeria.</p>
          <ul className="space-y-4">
            {zones.map((z, i) => {
              const upd = (patch: Partial<typeof z>) => setZones((p) => p.map((x, j) => (j === i ? { ...x, ...patch, dirty: true } : x)));
              return (
                <li key={z.id} className={`rounded-btn border p-4 ${z.is_active ? 'border-ink/30' : 'border-paper-line bg-paper-grey/50'}`}>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <AdminField id={`z-name-${i}`} label="Name" className="sm:col-span-2"><input id={`z-name-${i}`} value={z.name} onChange={(e) => upd({ name: e.target.value })} className={input} /></AdminField>
                    <AdminField id={`z-fee-${i}`} label="Fee (₦)" hint="0 = free"><input id={`z-fee-${i}`} inputMode="decimal" value={z.feeText} onChange={(e) => upd({ feeText: e.target.value })} className={input} /></AdminField>
                    <AdminField id={`z-eta-${i}`} label="Time"><input id={`z-eta-${i}`} value={z.eta ?? ''} onChange={(e) => upd({ eta: e.target.value })} className={input} placeholder="1–2 working days" /></AdminField>
                    <AdminField id={`z-desc-${i}`} label="Description" className="sm:col-span-2"><input id={`z-desc-${i}`} value={z.description ?? ''} onChange={(e) => upd({ description: e.target.value })} className={input} /></AdminField>
                    {z.requires_address ? (
                      <AdminField id={`z-states-${i}`} label="States covered" hint={z.states.length ? z.states.join(', ') : 'All states'} className="sm:col-span-2">
                        <select id={`z-states-${i}`} value="" onChange={(e) => { const s = e.target.value; if (s === '__all') upd({ states: [] }); else if (s) upd({ states: z.states.includes(s) ? z.states.filter((x) => x !== s) : [...z.states, s] }); }} className={input}>
                          <option value="">Add or remove a state…</option><option value="__all">Cover all states</option>
                          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{z.states.includes(s) ? '✓ ' : ''}{s}</option>)}
                        </select>
                      </AdminField>
                    ) : <p className="self-end text-sm text-muted sm:col-span-2">Pickup: no address needed.</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={z.is_active} onChange={(e) => upd({ is_active: e.target.checked })} className="h-4 w-4 accent-[#4CB748]" />Offer at checkout</label>
                    <Button variant={z.dirty ? 'primary' : 'outline'} className="!py-2" onClick={() => void saveZone(z)}>Save</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>

        <AdminCard title="Bank transfer">
          <p className="mb-4 text-sm text-muted">When on, customers can pay by transfer. Orders wait until you confirm the money arrived (Orders → open the order → Confirm payment).</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminField id="bt-bank" label="Bank"><input id="bt-bank" value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} className={input} /></AdminField>
            <AdminField id="bt-name" label="Account name"><input id="bt-name" value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} className={input} /></AdminField>
            <AdminField id="bt-num" label="Account number"><input id="bt-num" inputMode="numeric" maxLength={10} value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value.replace(/\D/g, '') })} className={`${input} tabular-nums`} /></AdminField>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={bank.enabled} onChange={(e) => setBank({ ...bank, enabled: e.target.checked })} className="h-4 w-4 accent-[#4CB748]" />Accept bank transfers</label>
            <Button onClick={() => void saveBank()}>Save bank details</Button>
          </div>
        </AdminCard>

        <AdminCard title="Discount codes">
          <div className="grid gap-3 sm:grid-cols-6">
            <AdminField id="cp-code" label="Code" className="sm:col-span-2"><input id="cp-code" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} className={`${input} uppercase`} placeholder="WELCOME10" /></AdminField>
            <AdminField id="cp-kind" label="Type"><select id="cp-kind" value={newCoupon.kind} onChange={(e) => setNewCoupon({ ...newCoupon, kind: e.target.value as 'percent' | 'fixed' })} className={input}><option value="percent">% off</option><option value="fixed">₦ off</option></select></AdminField>
            <AdminField id="cp-val" label={newCoupon.kind === 'percent' ? 'Percent' : 'Amount (₦)'}><input id="cp-val" inputMode="decimal" value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })} className={input} /></AdminField>
            <AdminField id="cp-min" label="Min. order (₦)"><input id="cp-min" inputMode="decimal" value={newCoupon.min} onChange={(e) => setNewCoupon({ ...newCoupon, min: e.target.value })} className={input} /></AdminField>
            <AdminField id="cp-max" label="Max uses"><input id="cp-max" inputMode="numeric" value={newCoupon.max} onChange={(e) => setNewCoupon({ ...newCoupon, max: e.target.value.replace(/\D/g, '') })} className={input} /></AdminField>
            <AdminField id="cp-end" label="Ends" className="sm:col-span-2"><input id="cp-end" type="date" value={newCoupon.ends} onChange={(e) => setNewCoupon({ ...newCoupon, ends: e.target.value })} className={input} /></AdminField>
            <div className="flex items-end sm:col-span-4"><Button onClick={() => void addCoupon()}>Create code</Button></div>
          </div>
          {coupons.length > 0 && (
            <ul className="mt-5 divide-y divide-paper-line border-t border-paper-line text-sm">
              {coupons.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="font-mono font-bold">{c.code}</span>
                  <span>{c.kind === 'percent' ? `${c.value}% off` : `${formatNaira(c.value)} off`}{c.min_order_kobo ? ` over ${formatNaira(c.min_order_kobo)}` : ''}</span>
                  <span className="text-muted">Used {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}{c.ends_at ? ` · ends ${new Date(c.ends_at).toLocaleDateString('en-NG')}` : ''}</span>
                  <label className="ml-auto flex items-center gap-2"><input type="checkbox" checked={c.is_active} onChange={async (e) => { const { error } = await sb.from('coupons').update({ is_active: e.target.checked }).eq('id', c.id); if (error) toast('Couldn’t update.'); else void load(); }} className="accent-[#4CB748]" />Active</label>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </>
  );
}
