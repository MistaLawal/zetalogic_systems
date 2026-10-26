import { Link } from 'react-router-dom';
import { ImageOff, Minus, Plus, ShoppingBag, Trash2, ShieldCheck } from 'lucide-react';
import { Container, ButtonLink } from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { getCartRows } from '../../data/cart';
import { useAsync } from '../../data/useAsync';
import { formatNaira } from '../../lib/money';
import { usePageMeta } from '../../lib/seo';

export default function Cart() {
  usePageMeta('Your cart', 'Review the items in your cart.');
  const { lines, setQuantity, remove, ready } = useCart();
  const key = lines.map((l) => `${l.productId}:${l.variantId ?? ''}:${l.quantity}`).join(',');
  const rows = useAsync(() => getCartRows(lines), [key]);

  if (lines.length === 0) {
    return (
      <Container className="py-16 lg:py-24">
        <div className="mx-auto max-w-md text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-brand-deep" aria-hidden="true" />
          <h1 className="mt-4 text-h2 text-ink">Your cart is empty</h1>
          <p className="mt-2 text-muted">Browse laptops, accessories, software and digital tools.</p>
          <ButtonLink to="/store" className="mt-8">Explore the store</ButtonLink>
        </div>
      </Container>
    );
  }

  const data = rows.status === 'ready' ? rows.data : [];
  const subtotal = data.reduce((s, r) => s + (r.product ? r.unitKobo * r.line.quantity : 0), 0);
  const blocked = data.some((r) => r.problem);

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold tracking-tight text-ink">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {rows.status === 'loading' || !ready ? <p className="text-muted" aria-busy="true">Loading your cart…</p>
            : rows.status === 'error' ? <p role="alert" className="text-muted">{rows.message}</p>
            : (
              <ul className="divide-y divide-paper-line border-y border-paper-line">
                {data.map((r) => {
                  const p = r.product;
                  const max = r.stock === null ? 10 : Math.max(1, Math.min(10, r.stock));
                  return (
                    <li key={`${r.line.productId}-${r.line.variantId ?? ''}`} className="flex gap-4 py-5">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-paper-grey">
                        {p?.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" /> : <ImageOff className="m-auto h-full w-6 text-muted/60" />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {p ? <Link to={`/store/product/${p.slug}`} className="font-semibold text-ink hover:underline">{p.name}</Link> : <span className="font-semibold text-muted">Item no longer available</span>}
                            {r.variantName && <p className="text-sm text-muted">{r.variantName}</p>}
                          </div>
                          <p className="shrink-0 text-right font-bold tabular-nums text-ink">{p ? formatNaira(r.unitKobo * r.line.quantity) : '—'}</p>
                        </div>
                        {p && <p className="text-sm text-muted tabular-nums">{formatNaira(r.unitKobo)} each{r.wasKobo && <s className="ml-2">{formatNaira(r.wasKobo)}</s>}</p>}
                        {r.problem && <p className="mt-1 text-sm font-semibold text-[#B42318]">{r.problem}</p>}
                        <div className="mt-auto flex items-center justify-between pt-3">
                          {p ? (
                            <div className="flex items-center rounded-btn border border-paper-line" role="group" aria-label={`Quantity of ${p.name}`}>
                              <button onClick={() => setQuantity(r.line.productId, r.line.variantId, r.line.quantity - 1)} disabled={r.line.quantity <= 1} className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                              <output className="w-8 text-center text-sm font-semibold tabular-nums">{r.line.quantity}</output>
                              <button onClick={() => setQuantity(r.line.productId, r.line.variantId, r.line.quantity + 1)} disabled={r.line.quantity >= max} className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                            </div>
                          ) : <span />}
                          <button onClick={() => remove(r.line.productId, r.line.variantId)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-muted hover:bg-paper-grey hover:text-[#B42318]">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          <Link to="/store" className="mt-6 inline-block text-sm font-semibold text-brand-deep hover:underline">Continue shopping</Link>
        </div>

        <aside className="h-fit rounded-card border border-paper-line bg-paper-grey p-6 lg:sticky lg:top-36">
          <h2 className="font-bold text-ink">Order summary</h2>
          <dl className="mt-4 space-y-2 text-[0.95rem]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-semibold tabular-nums">{formatNaira(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="text-muted">Chosen at checkout</dd></div>
          </dl>
          {blocked || rows.status !== 'ready'
            ? <span className="mt-6 flex w-full cursor-not-allowed items-center justify-center rounded-btn bg-brand/50 px-5 py-3 font-semibold text-ink/60">Check out</span>
            : <ButtonLink to="/checkout" className="mt-6 w-full">Check out</ButtonLink>}
          {blocked && <p className="mt-2 text-sm text-[#B42318]">Fix the items marked in red to continue.</p>}
          <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-deep" aria-hidden="true" />Payments are processed securely by Paystack. We never see or store your card details.</p>
        </aside>
      </div>
    </Container>
  );
}
