import { requireSupabase } from '../lib/supabase';
import { toSummary } from './catalog';
import type { CartLine } from '../context/CartContext';
import type { ProductSummary } from '../types/catalog';

export type CartRow = {
  line: CartLine;
  product: ProductSummary | null;     // null = no longer available
  variantName: string | null;
  unitKobo: number;
  wasKobo: number | null;
  stock: number | null;               // null = not stock-tracked
  problem: string | null;
};

/** Display details for cart lines. Checkout re-prices everything on the server. */
export async function getCartRows(lines: CartLine[]): Promise<CartRow[]> {
  if (!lines.length) return [];
  const sb = requireSupabase();
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const variantIds = [...new Set(lines.map((l) => l.variantId).filter(Boolean))] as string[];
  const [p, v] = await Promise.all([
    sb.from('catalog_products').select('*').in('id', productIds),
    variantIds.length ? sb.from('product_variants').select('id, product_id, name, price_kobo, sale_price_kobo, stock').in('id', variantIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error) throw p.error;
  if (v.error) throw v.error;
  const products = new Map((p.data ?? []).map((r) => [r.id as string, toSummary(r)]));
  const variants = new Map(((v.data ?? []) as { id: string; product_id: string; name: string; price_kobo: number | null; sale_price_kobo: number | null; stock: number }[]).map((r) => [r.id, r]));

  return lines.map((line) => {
    const product = products.get(line.productId) ?? null;
    const variant = line.variantId ? variants.get(line.variantId) : undefined;
    if (!product) return { line, product: null, variantName: null, unitKobo: 0, wasKobo: null, stock: null, problem: 'No longer available' };
    if (product.variantCount > 0 && !variant) return { line, product, variantName: null, unitKobo: product.effectivePriceKobo, wasKobo: null, stock: null, problem: 'Choose an option' };
    let unit = product.effectivePriceKobo; let was: number | null = product.onSale ? product.priceKobo : null;
    if (variant?.price_kobo != null) {
      const sale = variant.sale_price_kobo != null && variant.sale_price_kobo < variant.price_kobo ? Number(variant.sale_price_kobo) : null;
      unit = sale ?? Number(variant.price_kobo); was = sale ? Number(variant.price_kobo) : null;
    }
    const stock = product.type !== 'physical' ? null : variant ? variant.stock : product.stock;
    const problem = stock !== null && stock <= 0 ? 'Out of stock' : stock !== null && stock < line.quantity ? `Only ${stock} left` : null;
    return { line, product, variantName: variant?.name ?? null, unitKobo: unit, wasKobo: was, stock, problem };
  });
}

export type Zone = { id: string; name: string; description: string | null; states: string[]; fee_kobo: number; eta: string | null; requires_address: boolean };
export async function getZones(): Promise<Zone[]> {
  const { data, error } = await requireSupabase().from('shipping_zones').select('id, name, description, states, fee_kobo, eta, requires_address').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return (data ?? []) as Zone[];
}

export type Quote = { subtotal_kobo: number; discount_kobo: number; delivery_fee_kobo: number; total_kobo: number; has_physical: boolean; coupon_code: string | null };
export async function quote(lines: CartLine[], zoneId: string | null, coupon: string | null): Promise<Quote> {
  const { data, error } = await requireSupabase().rpc('quote_cart', {
    p_items: lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId ?? null, quantity: l.quantity })),
    p_zone_id: zoneId, p_coupon: coupon,
  });
  if (error) throw error;
  return data as Quote;
}

export type OrderView = {
  id: string; order_number: string; access_token: string; email: string; full_name: string; phone: string;
  delivery_method: string | null; ship_line1: string | null; ship_line2: string | null; ship_city: string | null; ship_state: string | null; ship_landmark: string | null;
  subtotal_kobo: number; discount_kobo: number; delivery_fee_kobo: number; total_kobo: number; coupon_code: string | null;
  payment_method: 'paystack' | 'bank_transfer'; payment_status: string; fulfilment_status: string;
  carrier: string | null; tracking_number: string | null; created_at: string; paid_at: string | null;
  items: { product_name: string; variant_name: string | null; sku: string; product_type: string; unit_price_kobo: number; quantity: number; line_total_kobo: number; product_id: string | null }[];
  events: { title: string; detail: string | null; created_at: string }[];
};
