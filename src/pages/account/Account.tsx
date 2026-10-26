import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Heart, LogOut, MapPin, Package, Download, User as UserIcon, Pencil, Trash2, Plus } from 'lucide-react';
import { Container, Button, ButtonLink } from '../../components/ui';
import { ProductCard, ProductGridSkeleton } from '../../components/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useShopper } from '../../context/ShopperContext';
import { useToast } from '../../components/Toast';
import { friendlyError, supabase } from '../../lib/supabase';
import { isNigerianPhone } from '../../lib/forms';
import { getProductsByIds } from '../../data/catalog';
import { useAsync } from '../../data/useAsync';
import { usePageMeta } from '../../lib/seo';
import { formatNaira } from '../../lib/money';
import { fulfilmentLabel, paymentLabel } from '../checkout/OrderPages';

const input = 'w-full rounded-btn border border-paper-line bg-white px-3.5 py-2.5 text-[0.95rem] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-[#B42318]';

export const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="py-24 text-center text-muted" aria-busy="true">Loading your account…</div>;
  if (!user) return <Navigate to={`/account/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

const nav = [
  { to: '/account', label: 'Profile', icon: UserIcon, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/downloads', label: 'Downloads', icon: Download },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
];

export function AccountLayout() {
  const { profile, user, signOut } = useAuth();
  return (
    <RequireAuth>
      <section className="border-b border-paper-line bg-paper-grey">
        <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold tracking-tight text-ink">Hello{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
            <p className="mt-1 break-all text-muted">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={() => void signOut()} className="self-start sm:self-auto"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</Button>
        </Container>
      </section>
      <Container className="grid gap-8 py-10 lg:grid-cols-[220px_1fr] lg:gap-12">
        <nav aria-label="Account" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-2 lg:flex-col lg:gap-1">
            {nav.map(({ to, label, icon: I, end }) => (
              <li key={to} className="shrink-0">
                <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-2.5 rounded-btn px-3.5 py-2.5 text-[0.92rem] font-semibold ${isActive ? 'bg-ink text-white' : 'text-ink/75 hover:bg-paper-grey hover:text-ink'}`}>
                  <I className="h-4 w-4" aria-hidden="true" />{label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </Container>
    </RequireAuth>
  );
}

function Panel({ title, intro, action, children }: { title: string; intro?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-[1.4rem] font-extrabold tracking-tight text-ink">{title}</h2>{intro && <p className="mt-1 text-muted">{intro}</p>}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ProfilePanel() {
  usePageMeta('Your account', 'Manage your Zetalogic Systems account.');
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(profile?.full_name ?? ''); setPhone(profile?.phone ?? ''); }, [profile]);
  useEffect(() => { if (params.get('updated') === 'password') toast('Password updated'); }, [params, toast]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (phone && !isNigerianPhone(phone)) return setError('Enter a Nigerian number like 0802 123 4567, or leave it blank.');
    setBusy(true); setError(null);
    const { error } = await supabase!.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('id', user!.id);
    setBusy(false);
    if (error) return setError(friendlyError(error, 'Your details couldn’t be saved. Try again.'));
    await refreshProfile();
    toast('Details saved');
  };

  return (
    <Panel title="Profile" intro="Used for delivery and order updates.">
      <form onSubmit={save} noValidate className="max-w-md space-y-5">
        <div><label htmlFor="pf-name" className="mb-1.5 block text-[0.88rem] font-semibold">Full name</label><input id="pf-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
        <div><label htmlFor="pf-phone" className="mb-1.5 block text-[0.88rem] font-semibold">Phone number</label><input id="pf-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="0802 123 4567" /></div>
        <div><p className="mb-1.5 text-[0.88rem] font-semibold">Email</p><p className="break-all text-muted">{user?.email}</p></div>
        {error && <p role="alert" className="text-[0.9rem] text-[#B42318]">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</Button>
          <Link to="/account/forgot-password" className="text-[0.9rem] font-semibold text-brand-deep hover:underline">Change password</Link>
        </div>
      </form>
    </Panel>
  );
}

function Empty({ icon: I, title, body, action }: { icon: typeof Package; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-ink/15 p-10 text-center">
      <I className="mx-auto h-8 w-8 text-brand-deep" aria-hidden="true" />
      <h3 className="mt-4 font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type OrderRow = { id: string; order_number: string; access_token: string; created_at: string; total_kobo: number; payment_status: string; fulfilment_status: string; order_items: { quantity: number; product_name: string }[] };

export function OrdersPanel() {
  usePageMeta('Your orders', 'Order history and tracking.');
  const { user } = useAuth();
  const orders = useAsync<OrderRow[]>(async () => {
    const { data, error } = await supabase!.from('orders')
      .select('id, order_number, access_token, created_at, total_kobo, payment_status, fulfilment_status, order_items(quantity, product_name)')
      .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  }, [user?.id]);
  return (
    <Panel title="Orders" intro="Track deliveries and see past purchases.">
      {orders.status === 'loading' ? <p className="text-muted" aria-busy="true">Loading orders…</p>
        : orders.status === 'error' ? <p role="alert" className="text-muted">{orders.message}</p>
        : orders.data.length === 0 ? <Empty icon={Package} title="No orders yet" body="When you buy something, it will appear here with its payment and delivery status." action={<ButtonLink to="/store" variant="dark">Browse the store</ButtonLink>} />
        : (
          <ul className="divide-y divide-paper-line rounded-card border border-paper-line">
            {orders.data.map((o) => {
              const pay = paymentLabel[o.payment_status];
              const count = o.order_items.reduce((n, i) => n + i.quantity, 0);
              return (
                <li key={o.id}>
                  <Link to={`/orders/${o.order_number}?token=${o.access_token}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 hover:bg-paper-grey sm:p-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{o.order_number}</p>
                      <p className="truncate text-sm text-muted">{new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · {count} {count === 1 ? 'item' : 'items'} · {o.order_items[0]?.product_name}{o.order_items.length > 1 ? ' and more' : ''}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pay?.tone ?? ''}`}>{pay?.text ?? o.payment_status}</span>
                    {o.payment_status === 'paid' && <span className="text-sm text-muted">{fulfilmentLabel[o.fulfilment_status]}</span>}
                    <span className="w-28 text-right font-bold tabular-nums">{formatNaira(o.total_kobo)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </Panel>
  );
}

export function DownloadsPanel() {
  usePageMeta('Your downloads', 'Files and licences you have bought.');
  return (
    <Panel title="Downloads and licences" intro="Digital products and software licences you’ve bought.">
      <Empty icon={Download} title="Nothing to download yet" body="Templates, guides and software you buy will be available here straight after payment is confirmed." action={<ButtonLink to="/store/category/digital-products" variant="dark">See digital products</ButtonLink>} />
    </Panel>
  );
}

export function WishlistPanel() {
  usePageMeta('Your wishlist', 'Products you saved.');
  const { wishlist, wishlistReady } = useShopper();
  const ids = [...wishlist];
  const data = useAsync(() => (wishlistReady ? getProductsByIds(ids) : new Promise<never>(() => {})), [wishlistReady, ids.join(',')]);
  return (
    <Panel title="Wishlist" intro="Products you’ve saved. Prices and stock update automatically.">
      {data.status === 'loading' ? <ProductGridSkeleton n={3} cols="lg:grid-cols-3" />
        : data.status === 'error' ? <p role="alert" className="text-muted">{data.message}</p>
        : data.data.length === 0 ? <Empty icon={Heart} title="Your wishlist is empty" body="Tap the heart on any product to save it here." action={<ButtonLink to="/store" variant="dark">Browse the store</ButtonLink>} />
        : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{data.data.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </Panel>
  );
}

type Address = { id: string; label: string | null; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; landmark: string | null; is_default: boolean };
const blank = { label: '', full_name: '', phone: '', line1: '', line2: '', city: '', state: 'Lagos', landmark: '', is_default: false };

export function AddressesPanel() {
  usePageMeta('Your addresses', 'Delivery addresses.');
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<(typeof blank & { id?: string }) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase!.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at');
    if (error) setLoadError(friendlyError(error, 'Your addresses couldn’t load.'));
    else setList(data as Address[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const errs: Record<string, string> = {};
    if (editing.full_name.trim().length < 2) errs.full_name = 'Enter the recipient’s name.';
    if (!isNigerianPhone(editing.phone)) errs.phone = 'Enter a Nigerian number like 0802 123 4567.';
    if (editing.line1.trim().length < 3) errs.line1 = 'Enter the street address.';
    if (editing.city.trim().length < 2) errs.city = 'Enter the town or city.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const row = {
      user_id: user!.id, label: editing.label.trim() || null, full_name: editing.full_name.trim(), phone: editing.phone.trim(),
      line1: editing.line1.trim(), line2: editing.line2.trim() || null, city: editing.city.trim(), state: editing.state,
      landmark: editing.landmark.trim() || null, is_default: editing.is_default || (list?.length ?? 0) === 0,
    };
    // Only one default address per customer: clear the old one first.
    if (row.is_default) await supabase!.from('addresses').update({ is_default: false }).eq('user_id', user!.id).eq('is_default', true);
    const { error } = editing.id
      ? await supabase!.from('addresses').update(row).eq('id', editing.id)
      : await supabase!.from('addresses').insert(row);
    setBusy(false);
    if (error) return toast(friendlyError(error, 'The address couldn’t be saved.'));
    toast('Address saved'); setEditing(null); void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase!.from('addresses').delete().eq('id', id);
    setConfirmDelete(null);
    if (error) return toast(friendlyError(error, 'The address couldn’t be removed.'));
    toast('Address removed'); void load();
  };

  const f = (k: keyof typeof blank, label: string, opts: { auto?: string; optional?: boolean } = {}) => (
    <div>
      <label htmlFor={`ad-${k}`} className="mb-1.5 block text-[0.88rem] font-semibold">{label}{opts.optional && <span className="font-normal text-muted"> (optional)</span>}</label>
      <input id={`ad-${k}`} autoComplete={opts.auto} value={String(editing![k] ?? '')} aria-invalid={!!errors[k]}
        onChange={(e) => { setEditing((p) => ({ ...p!, [k]: e.target.value })); setErrors((p) => ({ ...p, [k]: '' })); }} className={input} />
      {errors[k] && <p className="mt-1 text-[0.82rem] text-[#B42318]">{errors[k]}</p>}
    </div>
  );

  return (
    <Panel title="Delivery addresses" intro="Saved addresses appear at checkout."
      action={!editing && <Button variant="dark" onClick={() => { setEditing({ ...blank }); setErrors({}); }}><Plus className="h-4 w-4" aria-hidden="true" />Add address</Button>}>
      {editing && (
        <form onSubmit={save} noValidate className="mb-8 grid gap-4 rounded-card border border-paper-line p-5 sm:grid-cols-2 sm:p-6">
          {f('full_name', 'Recipient name', { auto: 'name' })}
          {f('phone', 'Phone number', { auto: 'tel' })}
          <div className="sm:col-span-2">{f('line1', 'Street address', { auto: 'address-line1' })}</div>
          <div className="sm:col-span-2">{f('line2', 'Apartment, floor, estate', { auto: 'address-line2', optional: true })}</div>
          {f('city', 'Town or city', { auto: 'address-level2' })}
          <div>
            <label htmlFor="ad-state" className="mb-1.5 block text-[0.88rem] font-semibold">State</label>
            <select id="ad-state" value={editing.state} onChange={(e) => setEditing((p) => ({ ...p!, state: e.target.value }))} className={input}>
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {f('landmark', 'Nearest landmark', { optional: true })}
          {f('label', 'Label, e.g. Home or Office', { optional: true })}
          <label className="flex items-center gap-2.5 text-[0.92rem] sm:col-span-2">
            <input type="checkbox" checked={editing.is_default} onChange={(e) => setEditing((p) => ({ ...p!, is_default: e.target.checked }))} className="h-4 w-4 accent-[#4CB748]" />
            Use as my default delivery address
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      )}
      {loadError ? <p role="alert" className="text-muted">{loadError}</p>
        : list === null ? <p className="text-muted" aria-busy="true">Loading addresses…</p>
        : list.length === 0 && !editing ? <Empty icon={MapPin} title="No saved addresses" body="Add an address now so checkout is quicker later." />
        : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((a) => (
              <li key={a.id} className={`rounded-card border p-5 ${a.is_default ? 'border-ink' : 'border-paper-line'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-ink">{a.label || a.full_name}</p>
                  {a.is_default && <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-ink">Default</span>}
                </div>
                <address className="mt-2 text-[0.92rem] not-italic leading-relaxed text-muted">
                  {a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state}{a.landmark ? <><br />Landmark: {a.landmark}</> : null}<br />{a.phone}
                </address>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => { setEditing({ ...blank, ...a, label: a.label ?? '', line2: a.line2 ?? '', landmark: a.landmark ?? '' }); setErrors({}); }} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold hover:bg-paper-grey"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  {confirmDelete === a.id ? (
                    <span className="inline-flex items-center gap-2 text-sm">Remove this address?
                      <button onClick={() => void remove(a.id)} className="rounded-md bg-[#B42318] px-2.5 py-1.5 font-semibold text-white">Remove</button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded-md px-2.5 py-1.5 font-semibold hover:bg-paper-grey">Keep</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(a.id)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-[#B42318] hover:bg-[#FEF3F2]"><Trash2 className="h-3.5 w-3.5" />Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </Panel>
  );
}
