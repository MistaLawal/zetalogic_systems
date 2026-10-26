import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search, PackageSearch, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Container, ButtonA, Button } from '../../components/ui';
import { ProductCard, ProductGridSkeleton, conditionLabel, typeLabel } from '../../components/ProductCard';
import { Icon } from '../../components/Icon';
import { getCategories, getFacets, searchProducts, type SortKey } from '../../data/catalog';
import { useAsync } from '../../data/useAsync';
import type { Condition, ProductType } from '../../types/catalog';
import { formatNaira, parseNairaToKobo } from '../../lib/money';
import { whatsappHref } from '../../lib/contact';
import { usePageMeta } from '../../lib/seo';
import type { IconName } from '../../config/site';
import NotFound from '../NotFound';

const PAGE_SIZE = 24;
const sorts: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-paper-line py-5 first:pt-0">
      <legend className="mb-3 text-[0.9rem] font-bold text-ink">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[0.92rem] text-ink/85 hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded accent-[#4CB748]" />
      {children}
    </label>
  );
}

export default function Store() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') ?? '';
  const brands = list(params.get('brand'));
  const types = list(params.get('type')) as ProductType[];
  const conditions = list(params.get('condition')) as Condition[];
  const min = params.get('min'); const max = params.get('max');
  const inStock = params.get('stock') === '1';
  const onSale = params.get('sale') === '1';
  const sort = (params.get('sort') as SortKey) || (q ? 'relevance' : 'newest');
  const page = Math.max(1, Number(params.get('page')) || 1);

  const categories = useAsync(getCategories, []);
  const category = categories.status === 'ready' ? categories.data.find((c) => c.slug === slug) : undefined;
  const facets = useAsync(() => getFacets(slug), [slug]);
  const results = useAsync(
    () => searchProducts({
      q, category: slug, brands, types, conditions, inStock, onSale, sort, page, pageSize: PAGE_SIZE,
      minKobo: min ? Number(min) * 100 : undefined, maxKobo: max ? Number(max) * 100 : undefined,
    }),
    [params.toString(), slug],
  );

  const title = q ? `Results for “${q}”` : category?.name ?? 'All products';
  usePageMeta(category?.name ?? (q ? `Search: ${q}` : 'Store'), category?.description ?? 'Shop laptops, accessories, software licences and digital products in naira, with delivery across Nigeria.');

  // Close the mobile filter sheet when the results change.
  useEffect(() => { setFiltersOpen(false); }, [slug]);

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    if (resetPage) next.delete('page');
    setParams(next);
  };
  const toggleIn = (key: string, current: string[], value: string) =>
    update({ [key]: (current.includes(value) ? current.filter((x) => x !== value) : [...current, value]).join(',') || null });

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    brands.forEach((b) => chips.push({ label: facets.status === 'ready' ? facets.data.brands.find((x) => x.slug === b)?.name ?? b : b, clear: () => toggleIn('brand', brands, b) }));
    types.forEach((t) => chips.push({ label: typeLabel[t] ?? t, clear: () => toggleIn('type', types, t) }));
    conditions.forEach((c) => chips.push({ label: conditionLabel[c] ?? c, clear: () => toggleIn('condition', conditions, c) }));
    if (min || max) chips.push({ label: `${min ? formatNaira(Number(min) * 100).replace('.00', '') : '₦0'} – ${max ? formatNaira(Number(max) * 100).replace('.00', '') : 'any'}`, clear: () => update({ min: null, max: null }) });
    if (inStock) chips.push({ label: 'In stock', clear: () => update({ stock: null }) });
    if (onSale) chips.push({ label: 'On sale', clear: () => update({ sale: null }) });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString(), facets.status]);

  if (slug && categories.status === 'ready' && !category) return <NotFound />;

  const filters = (
    <Filters
      facets={facets.status === 'ready' ? facets.data : null}
      brands={brands} types={types} conditions={conditions} inStock={inStock} onSale={onSale} min={min} max={max}
      toggleIn={toggleIn} update={update} hideTypes={!!slug}
    />
  );

  const total = results.status === 'ready' ? results.data.total : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <section className="border-b border-paper-line bg-paper-grey">
        <Container className="py-8 lg:py-10">
          <nav aria-label="Breadcrumb" className="mb-3 text-[0.85rem] text-muted">
            <ol className="flex flex-wrap gap-1.5">
              <li><Link to="/" className="hover:text-ink">Home</Link> /</li>
              <li>{slug ? <><Link to="/store" className="hover:text-ink">Store</Link> /</> : <span aria-current="page" className="text-ink">Store</span>}</li>
              {category && <li aria-current="page" className="text-ink">{category.name}</li>}
            </ol>
          </nav>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="max-w-prose">
              <h1 className="text-[clamp(1.75rem,3.4vw,2.6rem)] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
              {category?.description && !q && <p className="mt-2 text-muted">{category.description}</p>}
            </div>
            {results.status === 'ready' && <p className="text-[0.92rem] text-muted tabular-nums" aria-live="polite">{total} {total === 1 ? 'product' : 'products'}</p>}
          </div>
          {categories.status === 'ready' && (
            <nav aria-label="Categories" className="-mx-4 mt-6 overflow-x-auto px-4">
              <ul className="flex gap-2">
                <li><Link to={`/store${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={`inline-flex whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[0.85rem] font-semibold ${!slug ? 'border-ink bg-ink text-white' : 'border-paper-line bg-white text-ink hover:border-ink/40'}`}>All</Link></li>
                {categories.data.map((c) => (
                  <li key={c.slug}>
                    <Link to={`/store/category/${c.slug}${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[0.85rem] font-semibold ${slug === c.slug ? 'border-ink bg-ink text-white' : 'border-paper-line bg-white text-ink hover:border-ink/40'}`}>
                      {c.icon && <Icon name={c.icon as IconName} className="h-3.5 w-3.5" />}{c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </Container>
      </section>

      <Container className="grid gap-8 py-8 lg:grid-cols-[240px_1fr] lg:gap-10 lg:py-10">
        <aside className="hidden lg:block" aria-label="Filters">{filters}</aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <SearchWithin key={q} q={q} onSubmit={(v) => update({ q: v || null, sort: null })} />
            <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-btn border border-paper-line bg-white px-4 text-sm font-semibold lg:hidden">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filters{activeChips.length > 0 && <span className="rounded-full bg-brand px-1.5 text-xs font-bold text-ink">{activeChips.length}</span>}
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">Sort by</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products"
                className="h-11 rounded-btn border border-paper-line bg-white px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30">
                {sorts.filter((s) => s.value !== 'relevance' || q).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeChips.map((c) => (
                <button key={c.label} onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-[0.82rem] font-semibold text-ink hover:bg-brand/30" aria-label={`Remove filter ${c.label}`}>
                  {c.label}<X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
              <button onClick={() => setParams(q ? new URLSearchParams({ q }) : new URLSearchParams())} className="text-[0.85rem] font-semibold text-brand-deep underline underline-offset-4">Clear all</button>
            </div>
          )}

          {results.status === 'loading' ? <ProductGridSkeleton n={8} cols="sm:grid-cols-3 xl:grid-cols-4" />
            : results.status === 'error' ? (
              <div role="alert" className="rounded-card border border-paper-line p-8 text-center">
                <p className="font-semibold text-ink">Products couldn’t load</p>
                <p className="mt-1 text-muted">{results.message}</p>
                <Button variant="outline" className="mt-5" onClick={() => setParams(new URLSearchParams(params))}>Try again</Button>
              </div>
            ) : results.data.items.length === 0 ? (
              <NoResults q={q} filtered={activeChips.length > 0} clear={() => setParams(new URLSearchParams())} categoryName={category?.name} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {results.data.items.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
                {pages > 1 && (
                  <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="grid h-10 w-10 place-items-center rounded-btn border border-paper-line disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
                    <span className="px-3 text-sm text-muted tabular-nums">Page {page} of {pages}</span>
                    <button disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, false)} className="grid h-10 w-10 place-items-center rounded-btn border border-paper-line disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
                  </nav>
                )}
              </>
            )}
        </div>
      </Container>

      {filtersOpen && (
        <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
          <div className="mobile-sheet absolute inset-y-0 right-0 flex w-[min(90vw,380px)] flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-paper-line px-5">
              <h2 className="font-bold">Filters</h2>
              <button autoFocus onClick={() => setFiltersOpen(false)} className="grid h-10 w-10 place-items-center rounded-btn hover:bg-paper-grey" aria-label="Close filters"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filters}</div>
            <div className="border-t border-paper-line p-4">
              <Button className="w-full" onClick={() => setFiltersOpen(false)}>Show {results.status === 'ready' ? total : ''} results</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchWithin({ q, onSubmit }: { q: string; onSubmit: (v: string) => void }) {
  const [v, setV] = useState(q);
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); onSubmit(v.trim()); }} className="relative min-w-0 flex-1 basis-full sm:basis-64 sm:flex-none">
      <label htmlFor="store-search" className="sr-only">Search products</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input id="store-search" type="search" value={v} onChange={(e) => setV(e.target.value)} placeholder="Name, brand or SKU"
        className="h-11 w-full rounded-btn border border-paper-line bg-white pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
    </form>
  );
}

function Filters(props: {
  facets: import('../../types/catalog').Facets | null;
  brands: string[]; types: ProductType[]; conditions: Condition[]; inStock: boolean; onSale: boolean; min: string | null; max: string | null;
  toggleIn: (key: string, current: string[], value: string) => void;
  update: (changes: Record<string, string | null>) => void;
  hideTypes: boolean;
}) {
  const { facets, brands, types, conditions, inStock, onSale, toggleIn, update } = props;
  const [min, setMin] = useState(props.min ?? '');
  const [max, setMax] = useState(props.max ?? '');
  const [priceErr, setPriceErr] = useState<string | null>(null);
  useEffect(() => { setMin(props.min ?? ''); setMax(props.max ?? ''); }, [props.min, props.max]);

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    const lo = min ? parseNairaToKobo(min) : null;
    const hi = max ? parseNairaToKobo(max) : null;
    if ((min && lo === null) || (max && hi === null)) return setPriceErr('Enter amounts in naira, like 150000.');
    if (lo !== null && hi !== null && lo > hi) return setPriceErr('Minimum must be lower than maximum.');
    setPriceErr(null);
    update({ min: lo !== null ? String(Math.floor(lo / 100)) : null, max: hi !== null ? String(Math.ceil(hi / 100)) : null });
  };

  return (
    <div>
      <FilterGroup title="Availability">
        <Check checked={inStock} onChange={() => update({ stock: inStock ? null : '1' })}>In stock only</Check>
        <Check checked={onSale} onChange={() => update({ sale: onSale ? null : '1' })}>On sale</Check>
      </FilterGroup>
      <FilterGroup title="Price (₦)">
        <form onSubmit={applyPrice} className="space-y-2" noValidate>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="f-min">Minimum price</label>
            <input id="f-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder={facets?.minKobo != null ? String(Math.floor(facets.minKobo / 100)) : 'Min'}
              className="h-10 w-full min-w-0 rounded-btn border border-paper-line px-2.5 text-sm tabular-nums focus:border-brand focus:outline-none" />
            <span className="text-muted">–</span>
            <label className="sr-only" htmlFor="f-max">Maximum price</label>
            <input id="f-max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder={facets?.maxKobo != null ? String(Math.ceil(facets.maxKobo / 100)) : 'Max'}
              className="h-10 w-full min-w-0 rounded-btn border border-paper-line px-2.5 text-sm tabular-nums focus:border-brand focus:outline-none" />
          </div>
          {priceErr && <p className="text-[0.8rem] text-[#B42318]">{priceErr}</p>}
          <button type="submit" className="h-9 w-full rounded-btn border border-ink/15 text-sm font-semibold hover:border-ink/40">Apply price</button>
        </form>
      </FilterGroup>
      {!props.hideTypes && (facets?.types.length ?? 0) > 1 && (
        <FilterGroup title="Product type">
          {facets!.types.map((t) => <Check key={t} checked={types.includes(t)} onChange={() => toggleIn('type', types, t)}>{typeLabel[t]}</Check>)}
        </FilterGroup>
      )}
      {(facets?.conditions.length ?? 0) > 0 && (
        <FilterGroup title="Condition">
          {(['new', 'refurbished', 'used'] as Condition[]).filter((c) => facets!.conditions.includes(c)).map((c) =>
            <Check key={c} checked={conditions.includes(c)} onChange={() => toggleIn('condition', conditions, c)}>{conditionLabel[c]}</Check>)}
        </FilterGroup>
      )}
      {(facets?.brands.length ?? 0) > 0 && (
        <FilterGroup title="Brand">
          {facets!.brands.map((b) => (
            <Check key={b.slug} checked={brands.includes(b.slug)} onChange={() => toggleIn('brand', brands, b.slug)}>
              {b.name} <span className="text-muted tabular-nums">({b.count})</span>
            </Check>
          ))}
        </FilterGroup>
      )}
    </div>
  );
}

function NoResults({ q, filtered, clear, categoryName }: { q: string; filtered: boolean; clear: () => void; categoryName?: string }) {
  const empty = !q && !filtered;
  return (
    <div className="rounded-card border border-dashed border-ink/15 px-6 py-12 text-center">
      <PackageSearch className="mx-auto h-9 w-9 text-brand-deep" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold text-ink">
        {empty ? `${categoryName ?? 'The store'} is being stocked` : q ? `Nothing matches “${q}”` : 'No products match these filters'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-muted">
        {empty ? 'Products appear here as soon as they’re listed. Tell us what you need and we’ll send current options and prices.'
          : 'Try a shorter search, check the spelling, or remove a filter. We may also have it in stock without listing it yet.'}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {!empty && <Button variant="outline" onClick={clear}>Clear search and filters</Button>}
        <ButtonA href={whatsappHref(q ? `Hello Zetalogic, do you have: ${q}?` : 'Hello Zetalogic, what do you currently have in stock?')} variant="dark">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />Ask on WhatsApp
        </ButtonA>
      </div>
    </div>
  );
}
