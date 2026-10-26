import { Link } from 'react-router-dom';
import type { ProductSummary } from '../types/catalog';
import { formatNaira } from '../lib/money';
import { useCart } from '../context/CartContext';

const typeLabel = { physical: 'Hardware', downloadable: 'Download', software: 'Software licence' } as const;
const conditionLabel = { new: 'New', used: 'Used', refurbished: 'Refurbished' } as const;

function stockText(p: ProductSummary) {
  if (p.stock === null) return { text: 'Instant delivery after payment', tone: 'text-brand-deep' };
  if (p.stock <= 0) return { text: 'Out of stock', tone: 'text-[#B42318]' };
  if (p.stock <= 3) return { text: `Only ${p.stock} left`, tone: 'text-[#B54708]' };
  return { text: 'In stock', tone: 'text-brand-deep' };
}

export function ProductCard({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const onSale = p.salePriceKobo != null && p.salePriceKobo < p.priceKobo;
  const stock = stockText(p);
  const soldOut = p.stock !== null && p.stock <= 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-paper-line bg-white">
      <Link to={`/store/product/${p.slug}`} className="relative block aspect-[4/3] bg-paper-grey">
        {p.imageUrl && <img src={p.imageUrl} alt={p.imageAlt ?? p.name} loading="lazy" className="h-full w-full object-contain p-4" />}
        {onSale && <span className="absolute left-3 top-3 rounded-md bg-brand px-2 py-1 text-xs font-bold text-ink">Sale</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted">{typeLabel[p.type]}{p.condition && p.condition !== 'new' ? ` · ${conditionLabel[p.condition]}` : ''}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-ink"><Link to={`/store/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="mt-3 flex items-baseline gap-2 tabular-nums">
          <span className="text-lg font-extrabold text-ink">{formatNaira(onSale ? p.salePriceKobo! : p.priceKobo)}</span>
          {onSale && <s className="text-sm text-muted">{formatNaira(p.priceKobo)}</s>}
        </div>
        <p className={`mt-1 text-xs font-medium ${stock.tone}`}>{stock.text}</p>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => add({ productId: p.id, quantity: 1 })}
          className="mt-4 rounded-btn bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-paper-line disabled:text-muted"
        >
          {soldOut ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-paper-line bg-white">
          <div className="aspect-[4/3] animate-pulse bg-paper-grey" />
          <div className="space-y-2 p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-paper-grey" /><div className="h-4 w-4/5 animate-pulse rounded bg-paper-grey" /><div className="h-5 w-1/2 animate-pulse rounded bg-paper-grey" /></div>
        </div>
      ))}
    </div>
  );
}
