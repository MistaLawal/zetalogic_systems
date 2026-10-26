import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Heart, Scale, ShieldCheck, Truck, Info, Minus, Plus, MessageCircle, ImageOff, KeyRound, Check } from 'lucide-react';
import { Container, Button, ButtonA } from '../../components/ui';
import { ProductCard, ProductGridSkeleton, Rating, conditionLabel, stockState, typeLabel } from '../../components/ProductCard';
import { useToast } from '../../components/Toast';
import { getProductBySlug, getProductsByIds, getRelated } from '../../data/catalog';
import { useAsync } from '../../data/useAsync';
import { useCart } from '../../context/CartContext';
import { useShopper } from '../../context/ShopperContext';
import { formatNaira } from '../../lib/money';
import { whatsappHref } from '../../lib/contact';
import { usePageMeta } from '../../lib/seo';
import type { ProductDetail as Product, Variant } from '../../types/catalog';
import NotFound from '../NotFound';

function priceFor(p: Product, v: Variant | undefined) {
  if (v?.priceKobo != null) {
    const sale = v.salePriceKobo != null && v.salePriceKobo < v.priceKobo ? v.salePriceKobo : null;
    return { now: sale ?? v.priceKobo, was: sale ? v.priceKobo : null };
  }
  return { now: p.effectivePriceKobo, was: p.onSale ? p.priceKobo : null };
}

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const product = useAsync(() => getProductBySlug(slug), [slug]);

  if (product.status === 'loading') {
    return (
      <Container className="grid gap-10 py-10 lg:grid-cols-2" >
        <div className="aspect-square animate-pulse rounded-card bg-paper-grey" aria-busy="true" aria-label="Loading product" />
        <div className="space-y-4"><div className="h-4 w-1/4 animate-pulse rounded bg-paper-grey" /><div className="h-8 w-3/4 animate-pulse rounded bg-paper-grey" /><div className="h-7 w-1/3 animate-pulse rounded bg-paper-grey" /><div className="h-24 animate-pulse rounded bg-paper-grey" /></div>
      </Container>
    );
  }
  if (product.status === 'error') return <Container className="py-20 text-center"><p role="alert" className="text-muted">{product.message}</p></Container>;
  if (!product.data) return <NotFound />;
  return <ProductView key={product.data.id} p={product.data} />;
}

function ProductView({ p }: { p: Product }) {
  const { add } = useCart();
  const { wishlist, toggleWishlist, compare, toggleCompare, markViewed, recent } = useShopper();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [variantId, setVariantId] = useState<string | undefined>(p.variants.find((v) => v.stock > 0)?.id ?? p.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [imageIdx, setImageIdx] = useState(0);

  usePageMeta(p.seoTitle ?? p.name, p.seoDescription ?? p.shortDescription ?? `${p.name} at Zetalogic Systems. Price in naira, ${p.categoryName.toLowerCase()}.`);
  useEffect(() => { markViewed(p.id); }, [p.id, markViewed]);

  const variant = p.variants.find((v) => v.id === variantId);
  const stockNum = p.type !== 'physical' ? null : variant ? variant.stock : p.stock;
  const stock = stockState(stockNum, p.lowStockThreshold);
  const price = priceFor(p, variant);
  const maxQty = stockNum === null ? 10 : Math.max(1, Math.min(10, stockNum));
  useEffect(() => { setQty((q) => Math.min(q, maxQty)); }, [maxQty]);

  const related = useAsync(() => getRelated(p), [p.id]);
  const recentIds = recent.filter((id) => id !== p.id).slice(0, 4);
  const recentlyViewed = useAsync(() => getProductsByIds(recentIds), [recentIds.join(',')]);

  // Product structured data for search engines.
  useEffect(() => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku,
      description: p.shortDescription ?? undefined, image: p.images.map((i) => i.url),
      brand: p.brandName ? { '@type': 'Brand', name: p.brandName } : undefined,
      itemCondition: p.condition ? `https://schema.org/${p.condition === 'new' ? 'NewCondition' : p.condition === 'used' ? 'UsedCondition' : 'RefurbishedCondition'}` : undefined,
      offers: { '@type': 'Offer', priceCurrency: 'NGN', price: (price.now / 100).toFixed(2), availability: stock.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
      aggregateRating: p.rating ? { '@type': 'AggregateRating', ratingValue: p.rating.average, reviewCount: p.rating.count } : undefined,
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [p, price.now, stock.soldOut]);

  // Group variant attributes, e.g. RAM: [8GB, 16GB]
  const attrNames = useMemo(() => [...new Set(p.variants.flatMap((v) => Object.keys(v.attributes)))], [p.variants]);

  const saved = wishlist.has(p.id);
  const comparing = compare.includes(p.id);
  const img = p.images[imageIdx];

  const addToCart = () => {
    add({ productId: p.id, variantId: variant?.id, quantity: qty });
    toast(`${qty} × ${p.name}${variant ? ` (${variant.name})` : ''} added to cart`);
  };

  return (
    <>
      <Container className="py-6">
        <nav aria-label="Breadcrumb" className="text-[0.85rem] text-muted">
          <ol className="flex flex-wrap gap-1.5">
            <li><Link to="/store" className="hover:text-ink">Store</Link> /</li>
            <li><Link to={`/store/category/${p.categorySlug}`} className="hover:text-ink">{p.categoryName}</Link> /</li>
            <li aria-current="page" className="line-clamp-1 text-ink">{p.name}</li>
          </ol>
        </nav>
      </Container>

      <Container className="grid gap-10 pb-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        {/* Gallery */}
        <div className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-card border border-paper-line bg-paper-grey">
            {img ? <img src={img.url} alt={img.alt} className="h-full w-full object-contain p-6 mix-blend-multiply" />
              : <div className="grid h-full place-items-center text-muted"><ImageOff className="h-10 w-10" aria-hidden="true" /><span className="sr-only">No photo yet</span></div>}
            {p.onSale && <span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1 text-sm font-bold text-ink">Sale</span>}
          </div>
          {p.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Product photos">
              {p.images.map((im, i) => (
                <li key={im.id}>
                  <button onClick={() => setImageIdx(i)} aria-label={`Show photo ${i + 1}: ${im.alt}`} aria-current={i === imageIdx}
                    className={`aspect-square w-full overflow-hidden rounded-lg border-2 bg-paper-grey ${i === imageIdx ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}>
                    <img src={im.url} alt="" loading="lazy" className="h-full w-full object-contain p-1 mix-blend-multiply" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buy box */}
        <div className="min-w-0">
          <p className="text-sm text-muted">{p.brandName ? `${p.brandName} · ` : ''}{typeLabel[p.type]}{p.condition ? ` · ${conditionLabel[p.condition]}` : ''}</p>
          <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.25rem)] font-extrabold leading-tight tracking-tight text-ink">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>SKU {variant?.sku ?? p.sku}</span>
            {p.rating && <a href="#reviews" className="hover:underline"><Rating avg={p.rating.average} count={p.rating.count} size="md" /></a>}
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3 tabular-nums">
            <span className="text-[2rem] font-extrabold tracking-tight text-ink">{formatNaira(price.now)}</span>
            {price.was && <s className="text-lg text-muted">{formatNaira(price.was)}</s>}
            {price.was && <span className="rounded-md bg-brand-tint px-2 py-0.5 text-sm font-bold text-brand-deep">Save {formatNaira(price.was - price.now)}</span>}
          </div>
          {p.onSale && p.saleEndsAt && !variant?.priceKobo && <p className="mt-1 text-sm text-muted">Offer ends {new Date(p.saleEndsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}</p>}
          <p className={`mt-2 text-sm font-semibold ${stock.tone}`}>{stock.text}</p>

          {p.shortDescription && <p className="mt-5 max-w-prose text-[1.02rem] leading-relaxed text-ink/80">{p.shortDescription}</p>}

          {(p.condition === 'used' || p.condition === 'refurbished') && p.conditionNotes && (
            <div className="mt-6 rounded-card border border-[#F5C26B] bg-[#FFF8EB] p-4">
              <p className="flex items-center gap-2 font-bold text-ink"><Info className="h-4 w-4 text-[#B54708]" aria-hidden="true" />{conditionLabel[p.condition]} condition</p>
              <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink/80">{p.conditionNotes}</p>
            </div>
          )}

          {p.variants.length > 0 && (
            <fieldset className="mt-7">
              <legend className="mb-2.5 text-[0.92rem] font-bold text-ink">{attrNames.length ? `Choose ${attrNames.join(' / ').toLowerCase()}` : 'Choose an option'}</legend>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v) => {
                  const out = v.stock <= 0;
                  const selected = v.id === variantId;
                  return (
                    <label key={v.id} className={`relative cursor-pointer rounded-btn border px-4 py-2.5 text-[0.9rem] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${selected ? 'border-ink bg-ink text-white' : 'border-paper-line text-ink hover:border-ink/40'} ${out ? 'opacity-50' : ''}`}>
                      <input type="radio" name="variant" value={v.id} checked={selected} onChange={() => setVariantId(v.id)} className="sr-only" />
                      {v.name}{out && <span className="ml-1.5 text-xs font-normal">(sold out)</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-7 flex flex-wrap items-stretch gap-3">
            {p.type === 'physical' && (
              <div className="flex items-center rounded-btn border border-paper-line" role="group" aria-label="Quantity">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="grid h-12 w-11 place-items-center disabled:opacity-40" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                <output className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</output>
                <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} className="grid h-12 w-11 place-items-center disabled:opacity-40" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
              </div>
            )}
            <Button onClick={addToCart} disabled={stock.soldOut} className="h-12 flex-1 !py-0 sm:flex-none sm:min-w-[200px]">{stock.soldOut ? 'Out of stock' : 'Add to cart'}</Button>
            <button onClick={async () => {
                const r = await toggleWishlist(p.id);
                if (r === 'signin') navigate(`/account/sign-in?next=${encodeURIComponent(location.pathname)}`);
                else toast(r === 'added' ? 'Saved to your wishlist' : r === 'removed' ? 'Removed from your wishlist' : 'Couldn’t update your wishlist. Try again.');
              }}
              aria-pressed={saved} className="grid h-12 w-12 place-items-center rounded-btn border border-paper-line hover:border-ink/40" aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}>
              <Heart className={`h-5 w-5 ${saved ? 'fill-[#E5484D] text-[#E5484D]' : ''}`} />
            </button>
            <button onClick={() => { const r = toggleCompare(p.id); toast(r === 'full' ? 'You can compare up to 4 products. Remove one first.' : r === 'added' ? 'Added to compare' : 'Removed from compare'); }}
              aria-pressed={comparing} className={`grid h-12 w-12 place-items-center rounded-btn border ${comparing ? 'border-ink bg-ink text-white' : 'border-paper-line hover:border-ink/40'}`} aria-label={comparing ? 'Remove from compare' : 'Add to compare'}>
              <Scale className="h-5 w-5" />
            </button>
          </div>

          <ButtonA href={whatsappHref(`Hello Zetalogic, I'm interested in ${p.name} (SKU ${variant?.sku ?? p.sku}).`)} variant="outline" className="mt-3 w-full sm:w-auto">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />Ask about this product
          </ButtonA>

          <ul className="mt-8 divide-y divide-paper-line border-y border-paper-line text-[0.92rem]">
            {p.type === 'physical' ? (
              <li className="flex gap-3 py-3.5"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" /><span><strong className="text-ink">Delivery:</strong> <span className="text-muted">{p.deliveryNotes ?? 'Delivered across Lagos and nationwide. The delivery fee is shown at checkout before you pay.'}</span></span></li>
            ) : (
              <li className="flex gap-3 py-3.5"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" /><span><strong className="text-ink">Delivery:</strong> <span className="text-muted">{p.deliveryNotes ?? (p.type === 'downloadable' ? 'Download link in your account straight after payment is confirmed.' : 'Licence details and activation steps are sent after payment is confirmed.')}</span></span></li>
            )}
            {(p.warrantyMonths != null || p.warrantyNotes) && (
              <li className="flex gap-3 py-3.5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" /><span><strong className="text-ink">Warranty:</strong> <span className="text-muted">{p.warrantyMonths ? `${p.warrantyMonths} month${p.warrantyMonths === 1 ? '' : 's'}. ` : p.warrantyMonths === 0 ? 'No warranty. ' : ''}{p.warrantyNotes}</span></span></li>
            )}
            {p.type === 'software' && (p.licenceType || p.licenceDurationMonths) && (
              <li className="flex gap-3 py-3.5"><Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" /><span><strong className="text-ink">Licence:</strong> <span className="text-muted">{[p.licenceType, p.licenceDurationMonths ? `${p.licenceDurationMonths}-month term` : 'Perpetual'].filter(Boolean).join(', ')}. <Link to="/policies/software-licence" className="underline">Licence policy</Link></span></span></li>
            )}
          </ul>
        </div>
      </Container>

      {/* Details */}
      <section className="border-t border-paper-line bg-white py-12 lg:py-16">
        <Container className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <h2 className="text-h3 text-ink">About this product</h2>
            {p.description ? <div className="mt-4 max-w-prose whitespace-pre-line leading-relaxed text-ink/80">{p.description}</div>
              : <p className="mt-4 text-muted">{p.shortDescription ?? 'Ask us on WhatsApp for full details.'}</p>}
            {p.systemRequirements && (
              <>
                <h3 className="mt-8 font-bold text-ink">System requirements</h3>
                <p className="mt-2 max-w-prose whitespace-pre-line text-ink/80">{p.systemRequirements}</p>
              </>
            )}
          </div>
          {Object.keys(p.specs).length > 0 || variant ? (
            <div className="min-w-0">
              <h2 className="text-h3 text-ink">Specifications</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-[0.92rem]">
                  <tbody className="divide-y divide-paper-line border-y border-paper-line">
                    {Object.entries({ ...p.specs, ...(variant?.attributes ?? {}) }).map(([k, v]) => (
                      <tr key={k}><th scope="row" className="w-2/5 py-3 pr-4 text-left font-semibold text-ink">{k}</th><td className="py-3 text-ink/80">{String(v)}</td></tr>
                    ))}
                    {p.condition && <tr><th scope="row" className="py-3 pr-4 text-left font-semibold text-ink">Condition</th><td className="py-3 text-ink/80">{conditionLabel[p.condition]}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </Container>
      </section>

      <section id="reviews" className="scroll-mt-24 border-t border-paper-line bg-paper-grey py-12 lg:py-16">
        <Container>
          <h2 className="text-h3 text-ink">Customer reviews</h2>
          {p.reviews.length === 0 ? (
            <p className="mt-3 max-w-prose text-muted">No reviews yet. Only customers who bought this product can review it, and every review is checked before it appears.</p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {p.reviews.map((r) => (
                <li key={r.id} className="rounded-card bg-white p-5">
                  <div className="flex items-center gap-2"><Rating avg={r.rating} count={1} /><span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-deep"><Check className="h-3 w-3" />Verified purchase</span></div>
                  {r.title && <p className="mt-2 font-bold text-ink">{r.title}</p>}
                  {r.body && <p className="mt-1 text-ink/80">{r.body}</p>}
                  <p className="mt-3 text-xs text-muted">{r.reviewerName} · {new Date(r.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {(related.status !== 'ready' || related.data.length > 0) && (
        <section className="bg-white py-12 lg:py-16">
          <Container>
            <h2 className="mb-6 text-h3 text-ink">More in {p.categoryName}</h2>
            {related.status === 'ready' ? <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{related.data.map((x) => <ProductCard key={x.id} p={x} />)}</div>
              : related.status === 'loading' ? <ProductGridSkeleton /> : null}
          </Container>
        </section>
      )}

      {recentlyViewed.status === 'ready' && recentlyViewed.data.length > 0 && (
        <section className="border-t border-paper-line bg-white py-12 lg:py-16">
          <Container>
            <h2 className="mb-6 text-h3 text-ink">Recently viewed</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{recentlyViewed.data.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </Container>
        </section>
      )}
    </>
  );
}
