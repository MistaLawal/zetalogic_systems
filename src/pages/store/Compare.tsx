import { Link } from 'react-router-dom';
import { X, Scale, ImageOff } from 'lucide-react';
import { Container, ButtonLink } from '../../components/ui';
import { conditionLabel, stockState, typeLabel } from '../../components/ProductCard';
import { useShopper } from '../../context/ShopperContext';
import { getProductsByIds } from '../../data/catalog';
import { useAsync } from '../../data/useAsync';
import { requireSupabase } from '../../lib/supabase';
import { formatNaira } from '../../lib/money';
import { usePageMeta } from '../../lib/seo';
import type { ProductSummary } from '../../types/catalog';

async function loadCompare(ids: string[]) {
  const items = await getProductsByIds(ids);
  if (!items.length) return { items, specs: new Map<string, Record<string, string>>() };
  const { data, error } = await requireSupabase().from('products').select('id, specs, warranty_months').in('id', ids);
  if (error) throw error;
  const specs = new Map<string, Record<string, string>>();
  for (const r of data ?? []) {
    const s = { ...(r.specs as Record<string, string>) };
    if (r.warranty_months != null) s['Warranty'] = r.warranty_months ? `${r.warranty_months} months` : 'None';
    specs.set(r.id, s);
  }
  return { items, specs };
}

export default function Compare() {
  usePageMeta('Compare products', 'Compare prices, condition and specifications side by side.');
  const { compare, toggleCompare, clearCompare } = useShopper();
  const data = useAsync(() => loadCompare(compare), [compare.join(',')]);

  return (
    <Container className="py-10 lg:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold tracking-tight text-ink">Compare products</h1>
          <p className="mt-1 text-muted">Up to 4 products side by side. Your list stays on this device.</p>
        </div>
        {compare.length > 0 && <button onClick={clearCompare} className="text-sm font-semibold text-brand-deep underline underline-offset-4">Clear compare list</button>}
      </div>
      {compare.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink/15 p-12 text-center">
          <Scale className="mx-auto h-8 w-8 text-brand-deep" aria-hidden="true" />
          <h2 className="mt-4 font-bold text-ink">Nothing to compare yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-muted">Tap the scales icon on any product to add it here.</p>
          <ButtonLink to="/store" variant="dark" className="mt-6">Browse the store</ButtonLink>
        </div>
      ) : data.status === 'loading' ? <p className="text-muted" aria-busy="true">Loading comparison…</p>
        : data.status === 'error' ? <p role="alert" className="text-muted">{data.message}</p>
        : <Table items={data.data.items} specs={data.data.specs} remove={(id) => toggleCompare(id)} />}
    </Container>
  );
}

function Table({ items, specs, remove }: { items: ProductSummary[]; specs: Map<string, Record<string, string>>; remove: (id: string) => void }) {
  const specKeys = [...new Set(items.flatMap((p) => Object.keys(specs.get(p.id) ?? {})))];
  const rows: [string, (p: ProductSummary) => React.ReactNode][] = [
    ['Price', (p) => <span className="font-extrabold tabular-nums">{p.variantCount > 0 && 'From '}{formatNaira(p.effectivePriceKobo)}{p.onSale && <s className="ml-2 font-normal text-muted">{formatNaira(p.priceKobo)}</s>}</span>],
    ['Availability', (p) => { const s = stockState(p.stock, p.lowStockThreshold); return <span className={s.tone}>{s.text}</span>; }],
    ['Type', (p) => typeLabel[p.type]],
    ['Brand', (p) => p.brandName ?? '—'],
    ['Condition', (p) => (p.condition ? conditionLabel[p.condition] : '—')],
    ['Rating', (p) => (p.rating ? `${p.rating.average.toFixed(1)} (${p.rating.count})` : 'No reviews yet')],
    ...specKeys.map((k): [string, (p: ProductSummary) => React.ReactNode] => [k, (p) => specs.get(p.id)?.[k] ?? '—']),
  ];
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[0.92rem]">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-40 bg-white" ><span className="sr-only">Feature</span></th>
            {items.map((p) => (
              <th key={p.id} scope="col" className="min-w-[180px] p-3 text-left align-top font-normal">
                <div className="relative rounded-card border border-paper-line p-3">
                  <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name} from compare`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white hover:bg-paper-grey"><X className="h-4 w-4" /></button>
                  <div className="aspect-[4/3] rounded-lg bg-paper-grey">{p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-contain p-2 mix-blend-multiply" /> : <ImageOff className="m-auto h-full w-6 text-muted/60" />}</div>
                  <Link to={`/store/product/${p.slug}`} className="mt-3 line-clamp-2 block font-semibold text-ink hover:underline">{p.name}</Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, cell]) => (
            <tr key={label}>
              <th scope="row" className="sticky left-0 border-t border-paper-line bg-white py-3 pr-4 text-left font-semibold text-ink">{label}</th>
              {items.map((p) => <td key={p.id} className="border-t border-paper-line px-3 py-3 text-ink/85">{cell(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
