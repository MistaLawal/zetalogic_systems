import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, Plus, Search } from 'lucide-react';
import { ButtonLink } from '../../components/ui';
import { PageTitle } from './AdminLayout';
import { useAsync } from '../../data/useAsync';
import { requireSupabase } from '../../lib/supabase';
import { formatNaira } from '../../lib/money';
import { usePageMeta } from '../../lib/seo';

type Row = {
  id: string; name: string; sku: string; slug: string; type: string; status: string; price_kobo: number; sale_price_kobo: number | null;
  stock: number | null; low_stock_threshold: number; is_featured: boolean; updated_at: string;
  categories: { name: string } | null; brands: { name: string } | null;
  product_variants: { stock: number; is_active: boolean }[]; product_images: { url: string; sort_order: number }[];
};

const statusTone: Record<string, string> = { published: 'bg-brand-tint text-brand-deep', draft: 'bg-[#FFF4D6] text-[#B54708]', archived: 'bg-paper-grey text-muted' };

export default function AdminProducts() {
  usePageMeta('Products · Admin', 'Manage products.');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const data = useAsync<Row[]>(async () => {
    const { data, error } = await requireSupabase().from('products')
      .select('id, name, sku, slug, type, status, price_kobo, sale_price_kobo, stock, low_stock_threshold, is_featured, updated_at, categories(name), brands(name), product_variants(stock, is_active), product_images(url, sort_order)')
      .order('updated_at', { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as unknown as Row[];
  }, []);

  const rows = useMemo(() => {
    if (data.status !== 'ready') return [];
    const term = q.trim().toLowerCase();
    return data.data.filter((r) => (status === 'all' || r.status === status) && (!term || r.name.toLowerCase().includes(term) || r.sku.toLowerCase().includes(term)));
  }, [data, q, status]);

  const stockOf = (r: Row) => {
    if (r.type !== 'physical') return null;
    const active = r.product_variants.filter((v) => v.is_active);
    return active.length ? active.reduce((s, v) => s + v.stock, 0) : r.stock ?? 0;
  };

  return (
    <>
      <PageTitle title="Products" intro="Create, edit, publish and remove store products." action={<ButtonLink to="/admin/products/new"><Plus className="h-4 w-4" aria-hidden="true" />Add product</ButtonLink>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="ap-search" className="sr-only">Search products</label>
          <input id="ap-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className="h-10 w-full rounded-btn border border-paper-line bg-white pl-9 pr-3 text-sm" />
        </div>
        <div className="flex rounded-btn border border-paper-line bg-white p-1 text-sm" role="tablist" aria-label="Status">
          {(['all', 'published', 'draft', 'archived'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`rounded-[7px] px-3 py-1.5 font-semibold capitalize ${status === s ? 'bg-ink text-white' : 'text-ink/70'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-paper-line bg-white">
        {data.status === 'loading' ? <p className="p-6 text-muted" aria-busy="true">Loading products…</p>
          : data.status === 'error' ? <p role="alert" className="p-6 text-muted">{data.message}</p>
          : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-ink">{data.data.length ? 'No products match.' : 'No products yet.'}</p>
              {!data.data.length && <ButtonLink to="/admin/products/new" className="mt-4">Add your first product</ButtonLink>}
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-paper-line bg-paper-grey text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-3 font-semibold">Product</th><th className="p-3 font-semibold">Category</th><th className="p-3 text-right font-semibold">Price</th><th className="p-3 text-right font-semibold">Stock</th><th className="p-3 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {rows.map((r) => {
                  const img = [...r.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
                  const st = stockOf(r);
                  return (
                    <tr key={r.id} className="hover:bg-paper-grey/60">
                      <td className="p-3">
                        <Link to={`/admin/products/${r.id}`} className="flex items-center gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-paper-grey">{img ? <img src={img.url} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : <ImageOff className="h-4 w-4 text-muted" />}</span>
                          <span className="min-w-0"><span className="block font-semibold text-ink hover:underline">{r.name}</span><span className="text-xs text-muted">{r.sku}{r.brands ? ` · ${r.brands.name}` : ''}{r.is_featured ? ' · Featured' : ''}</span></span>
                        </Link>
                      </td>
                      <td className="p-3 text-muted">{r.categories?.name}</td>
                      <td className="p-3 text-right tabular-nums">{formatNaira(r.sale_price_kobo ?? r.price_kobo)}{r.sale_price_kobo != null && <s className="block text-xs text-muted">{formatNaira(r.price_kobo)}</s>}</td>
                      <td className={`p-3 text-right tabular-nums ${st !== null && st <= r.low_stock_threshold ? 'font-bold text-[#B42318]' : ''}`}>{st ?? 'Digital'}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusTone[r.status]}`}>{r.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </>
  );
}
