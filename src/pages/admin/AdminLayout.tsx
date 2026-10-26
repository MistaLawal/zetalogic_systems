import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Settings, ExternalLink, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth, type AppRole } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import { Container } from '../../components/ui';

export const STAFF_ROLES: AppRole[] = ['super_admin', 'store_manager', 'order_manager', 'content_manager', 'customer_support'];
export const can = {
  products: (r: AppRole[]) => r.some((x) => x === 'super_admin' || x === 'store_manager'),
  orders: (r: AppRole[]) => r.some((x) => x === 'super_admin' || x === 'order_manager'),
  viewOrders: (r: AppRole[]) => r.some((x) => ['super_admin', 'order_manager', 'customer_support', 'store_manager'].includes(x)),
  settings: (r: AppRole[]) => r.some((x) => x === 'super_admin' || x === 'store_manager'),
};

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, show: (_: AppRole[]) => true },
  { to: '/admin/products', label: 'Products', icon: Package, show: can.products },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, show: can.viewOrders },
  { to: '/admin/settings', label: 'Store settings', icon: Settings, show: can.settings },
];

/** Separate, protected admin area. Every action is also enforced by database policies. */
export function AdminLayout() {
  const { user, roles, ready, signOut } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="grid min-h-screen place-items-center text-muted" aria-busy="true">Loading…</div>;
  if (!user) return <Navigate to={`/account/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!roles.some((r) => STAFF_ROLES.includes(r))) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper-grey px-4">
        <div className="max-w-md rounded-card bg-white p-8 text-center shadow-lift">
          <ShieldAlert className="mx-auto h-8 w-8 text-[#B54708]" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-extrabold">Staff access only</h1>
          <p className="mt-2 text-muted">You’re signed in as {user.email}, which doesn’t have admin access. Ask the store owner to give your account a staff role.</p>
          <Link to="/" className="mt-6 inline-block font-semibold text-brand-deep underline">Back to the store</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-paper-grey">
      <header className="sticky top-0 z-30 border-b border-paper-line bg-ink text-white">
        <Container className="flex h-14 items-center gap-4">
          <Link to="/admin" className="flex items-center gap-3"><Logo variant="white" className="w-[104px]" /><span className="rounded bg-brand px-1.5 py-0.5 text-[0.7rem] font-bold text-ink">ADMIN</span></Link>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <span className="hidden text-white/60 md:inline">{user.email}</span>
            <Link to="/" target="_blank" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10"><ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">View store</span></Link>
            <button onClick={() => void signOut()} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10"><LogOut className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </Container>
      </header>
      <Container className="grid gap-6 py-6 lg:grid-cols-[200px_1fr] lg:py-8">
        <nav aria-label="Admin" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1.5 lg:flex-col">
            {nav.filter((n) => n.show(roles)).map(({ to, label, icon: I, end }) => (
              <li key={to} className="shrink-0">
                <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-2.5 whitespace-nowrap rounded-btn px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white text-ink shadow-sm' : 'text-ink/70 hover:bg-white/60 hover:text-ink'}`}>
                  <I className="h-4 w-4" aria-hidden="true" />{label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0"><Outlet /></main>
      </Container>
    </div>
  );
}

export function AdminCard({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-paper-line bg-white p-5 sm:p-6 ${className}`}>
      {(title || action) && <div className="mb-4 flex flex-wrap items-center justify-between gap-3">{title && <h2 className="font-bold text-ink">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export const adminInput = 'w-full rounded-btn border border-paper-line bg-white px-3 py-2.5 text-[0.92rem] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-[#B42318] disabled:bg-paper-grey';

export function AdminField({ id, label, hint, error, children, className = '' }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-[0.85rem] font-semibold text-ink">{label}</label>
      {children}
      {error ? <p className="mt-1 text-[0.8rem] text-[#B42318]">{error}</p> : hint ? <p className="mt-1 text-[0.8rem] text-muted">{hint}</p> : null}
    </div>
  );
}

export function PageTitle({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-[1.6rem] font-extrabold tracking-tight text-ink">{title}</h1>{intro && <p className="mt-1 text-muted">{intro}</p>}</div>
      {action}
    </div>
  );
}

/** Convert naira text ("450,000") to kobo, or null if blank/invalid. */
export function nairaToKobo(v: string): number | null {
  const clean = v.replace(/[₦,\s]/g, '');
  if (!clean) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
  return Math.round(Number(clean) * 100);
}
export const koboToNaira = (k: number | null | undefined) => (k == null ? '' : String(k / 100));
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
