import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Scale, Star, ImageOff } from 'lucide-react';
import type { ProductSummary } from '../types/catalog';
import { formatNaira } from '../lib/money';
import { useCart } from '../context/CartContext';
import { useShopper } from '../context/ShopperContext';
import { useToast } from './Toast';

export const typeLabel = { physical: 'Hardware', downloadable: 'Download', software: 'Software' } as const;
export const conditionLabel = { new: 'New', used: 'Used', refurbished: 'Refurbished' } as const;

export function stockState(stock: number | null, low = 3) {
  if (stock === null) return { text: 'Delivered digitally after payment', tone: 'text-brand-deep', soldOut: false };
  if (stock <= 0) return { text: 'Out of stock', tone: 'text-[#B42318]', soldOut: true };
  if (stock <= low) return { text: `Only ${stock} left`, tone: 'text-[#B54708]', soldOut: false };
  return { text: 'In stock', tone: 'text-brand-deep', soldOut: false };
}

export function Rating({ avg, count, size = 'sm' }: { avg: number; count: number; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-xs' : 'text-sm'} text-muted`} aria-label={`Rated ${avg} out of 5 from ${count} reviews`}>
      <Star className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill-[#F5B301] text-[#F5B301]`} aria-hidden="true" />
      <span className="font-semibold text-ink">{avg.toFixed(1)}</span> ({count})
    </span>
  );
}

export function ProductCard({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const { wishlist, toggleWishlist, compare, toggleCompare } = useShopper();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const stock = stockState(p.stock, p.lowStockThreshold);
  const saved = wishlist.has(p.id);
  const comparing = compare.includes(p.id);
  const href = `/store/product/${p.slug}`;

  const onWishlist = async () => {
    const r = await toggleWishlist(p.id);
    if (r === 'signin') navigate(`/account/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`);
    else if (r === 'added') toast('Saved to your wishlist');
    else if (r === 'removed') toast('Removed from your wishlist');
    else toast('Couldn’t update your wishlist. Try again.');
  };
  const onCompare = () => {
    const r = toggleCompare(p.id);
    toast(r === 'full' ? 'You can compare up to 4 products. Remove one first.' : r === 'added' ? 'Added to compare' : 'Removed from compare');
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-paper-line bg-white">
      <div className="relative">
        <Link to={href} className="block aspect-[4/3] bg-paper-grey" tabIndex={-1} aria-hidden="true">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-4 mix-blend-multiply" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted/60"><ImageOff className="h-8 w-8" /></span>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.onSale && <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-ink">Sale</span>}
          {p.condition && p.condition !== 'new' && <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">{conditionLabel[p.condition]}</span>}
        </div>
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button type="button" onClick={onWishlist} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Heart className={`h-4 w-4 ${saved ? 'fill-[#E5484D] text-[#E5484D]' : ''}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={onCompare} aria-pressed={comparing} aria-label={comparing ? `Remove ${p.name} from compare` : `Compare ${p.name}`}
            className={`grid h-9 w-9 place-items-center rounded-full shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${comparing ? 'bg-ink text-white' : 'bg-white/95 text-ink hover:bg-white'}`}>
            <Scale className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted">{p.brandName ? `${p.brandName} · ` : ''}{typeLabel[p.type]}</p>
        <h3 className="mt-1 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">{p.name}</Link>
        </h3>
        {p.rating && <div className="mt-1.5"><Rating avg={p.rating.average} count={p.rating.count} /></div>}
        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
            {p.variantCount > 0 && <span className="text-xs text-muted">From</span>}
            <span className="text-lg font-extrabold text-ink">{formatNaira(p.effectivePriceKobo)}</span>
            {p.onSale && <s className="text-sm text-muted">{formatNaira(p.priceKobo)}</s>}
          </div>
          <p className={`mt-1 text-xs font-medium ${stock.tone}`}>{stock.text}</p>
          {p.variantCount > 0 ? (
            <Link to={href} className="relative z-10 mt-3 block rounded-btn border border-ink/15 py-2.5 text-center text-sm font-semibold text-ink hover:border-ink/40">Choose options</Link>
          ) : (
            <button type="button" disabled={stock.soldOut}
              onClick={() => { add({ productId: p.id, quantity: 1 }); toast(`${p.name} added to cart`); }}
              className="relative z-10 mt-3 w-full rounded-btn bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-paper-line disabled:text-muted">
              {stock.soldOut ? 'Out of stock' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ n = 4, cols = 'lg:grid-cols-4' }: { n?: number; cols?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${cols}`} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-paper-line bg-white">
          <div className="aspect-[4/3] animate-pulse bg-paper-grey" />
          <div className="space-y-2 p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-paper-grey" /><div className="h-4 w-4/5 animate-pulse rounded bg-paper-grey" /><div className="h-5 w-1/2 animate-pulse rounded bg-paper-grey" /></div>
        </div>
      ))}
    </div>
  );
}
