import { requireSupabase } from '../lib/supabase';
import type { Category, Condition, Facets, ProductDetail, ProductSummary, ProductType, Review, Variant } from '../types/catalog';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toSummary(r: any): ProductSummary {
  return {
    id: r.id, slug: r.slug, sku: r.sku, name: r.name, type: r.type, condition: r.condition ?? null,
    shortDescription: r.short_description ?? null,
    categorySlug: r.category_slug, categoryName: r.category_name,
    brandSlug: r.brand_slug ?? null, brandName: r.brand_name ?? null,
    priceKobo: Number(r.price_kobo), effectivePriceKobo: Number(r.effective_price_kobo), onSale: !!r.on_sale,
    variantCount: r.variant_count ?? 0, stock: r.stock_total ?? null, lowStockThreshold: r.low_stock_threshold ?? 3,
    imageUrl: r.image_url ?? null, imageAlt: r.image_alt ?? null,
    rating: r.rating_count > 0 ? { average: Number(r.rating_avg), count: r.rating_count } : null,
  };
}

export type SortKey = 'relevance' | 'newest' | 'popular' | 'price_asc' | 'price_desc';

export type SearchParams = {
  q?: string;
  category?: string;
  brands?: string[];
  types?: ProductType[];
  conditions?: Condition[];
  minKobo?: number;
  maxKobo?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

export async function searchProducts(p: SearchParams): Promise<{ items: ProductSummary[]; total: number }> {
  const pageSize = p.pageSize ?? 24;
  const page = Math.max(1, p.page ?? 1);
  const { data, error } = await requireSupabase().rpc('catalog_search', {
    p_q: p.q || null,
    p_category: p.category || null,
    p_brands: p.brands?.length ? p.brands : null,
    p_types: p.types?.length ? p.types : null,
    p_conditions: p.conditions?.length ? p.conditions : null,
    p_min_kobo: p.minKobo ?? null,
    p_max_kobo: p.maxKobo ?? null,
    p_in_stock: !!p.inStock,
    p_on_sale: !!p.onSale,
    p_sort: p.sort === 'newest' ? 'newest' : (p.sort ?? 'relevance'),
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  return { items: rows.map(toSummary), total: rows.length ? Number(rows[0].total_count) : 0 };
}

export async function getFacets(category?: string): Promise<Facets> {
  const { data, error } = await requireSupabase().rpc('catalog_facets', { p_category: category ?? null });
  if (error) throw error;
  const d = data as any;
  return {
    brands: d.brands ?? [], types: d.types ?? [], conditions: d.conditions ?? [],
    minKobo: d.min_kobo ?? null, maxKobo: d.max_kobo ?? null, total: d.total ?? 0,
  };
}

let categoriesCache: Promise<Category[]> | null = null;
export function getCategories(): Promise<Category[]> {
  categoriesCache ??= (async () => {
    const { data, error } = await requireSupabase()
      .from('categories').select('id, slug, name, description, icon').eq('is_active', true).order('sort_order');
    if (error) { categoriesCache = null; throw error; }
    return (data ?? []) as Category[];
  })();
  return categoriesCache;
}

/** Products by id, keeping the requested order (wishlist, compare, recently viewed). */
export async function getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await requireSupabase().from('catalog_products').select('*').in('id', ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((r: any) => [r.id, toSummary(r)]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductSummary[];
}

export async function getCollection(kind: 'featured' | 'new-arrivals' | 'offers', limit = 8): Promise<ProductSummary[]> {
  let q = requireSupabase().from('catalog_products').select('*').limit(limit);
  if (kind === 'featured') q = q.eq('is_featured', true).order('published_at', { ascending: false });
  if (kind === 'new-arrivals') q = q.order('published_at', { ascending: false });
  if (kind === 'offers') q = q.eq('on_sale', true).order('sale_ends_at', { ascending: true, nullsFirst: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toSummary);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const sb = requireSupabase();
  const { data: s, error } = await sb.from('catalog_products').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!s) return null;
  const [full, variants, images, reviews] = await Promise.all([
    sb.from('products').select('category_id, description, specs, condition_notes, warranty_months, warranty_notes, system_requirements, licence_type, licence_duration_months, delivery_notes, sale_ends_at, seo_title, seo_description').eq('id', s.id).single(),
    sb.from('product_variants').select('id, sku, name, attributes, price_kobo, sale_price_kobo, stock').eq('product_id', s.id).eq('is_active', true).order('sort_order'),
    sb.from('product_images').select('id, url, alt').eq('product_id', s.id).order('sort_order'),
    sb.from('product_reviews').select('id, rating, title, body, reviewer_name, created_at').eq('product_id', s.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(20),
  ]);
  for (const r of [full, variants, images, reviews]) if (r.error) throw r.error;
  const f = full.data as any;
  return {
    ...toSummary(s),
    categoryId: f.category_id,
    description: f.description, specs: (f.specs ?? {}) as Record<string, string>,
    conditionNotes: f.condition_notes, warrantyMonths: f.warranty_months, warrantyNotes: f.warranty_notes,
    systemRequirements: f.system_requirements, licenceType: f.licence_type, licenceDurationMonths: f.licence_duration_months,
    deliveryNotes: f.delivery_notes, saleEndsAt: f.sale_ends_at, seoTitle: f.seo_title, seoDescription: f.seo_description,
    variants: ((variants.data ?? []) as any[]).map((v): Variant => ({
      id: v.id, sku: v.sku, name: v.name, attributes: v.attributes ?? {},
      priceKobo: v.price_kobo == null ? null : Number(v.price_kobo),
      salePriceKobo: v.sale_price_kobo == null ? null : Number(v.sale_price_kobo), stock: v.stock,
    })),
    images: (images.data ?? []) as ProductDetail['images'],
    reviews: ((reviews.data ?? []) as any[]).map((r): Review => ({
      id: r.id, rating: r.rating, title: r.title, body: r.body, reviewerName: r.reviewer_name, createdAt: r.created_at,
    })),
  };
}

export async function getRelated(p: ProductDetail, limit = 4): Promise<ProductSummary[]> {
  const { data, error } = await requireSupabase().from('catalog_products').select('*')
    .eq('category_slug', p.categorySlug).neq('id', p.id).order('sold_count', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(toSummary);
}
