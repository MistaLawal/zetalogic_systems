-- Phase 2 / 3: read model for the storefront. security_invoker keeps RLS in force.
create or replace view public.catalog_products with (security_invoker = true) as
with v as (
  select pv.product_id,
         count(*) as variant_count,
         sum(pv.stock)::int as variant_stock,
         min(coalesce(pv.sale_price_kobo, pv.price_kobo)) as min_variant_price
  from public.product_variants pv
  where pv.is_active
  group by pv.product_id
), img as (
  select distinct on (pi.product_id) pi.product_id, pi.url, pi.alt
  from public.product_images pi
  order by pi.product_id, pi.sort_order, pi.created_at
), r as (
  select pr.product_id, round(avg(pr.rating)::numeric, 1) as rating_avg, count(*)::int as rating_count
  from public.product_reviews pr where pr.status = 'approved'
  group by pr.product_id
)
select
  p.id, p.slug, p.sku, p.name, p.type, p.condition, p.short_description,
  p.is_featured, p.sold_count, p.published_at, p.created_at,
  c.slug as category_slug, c.name as category_name,
  b.slug as brand_slug, b.name as brand_name,
  p.price_kobo,
  (p.sale_price_kobo is not null
     and (p.sale_starts_at is null or p.sale_starts_at <= now())
     and (p.sale_ends_at is null or p.sale_ends_at > now())) as on_sale,
  case when p.sale_price_kobo is not null
        and (p.sale_starts_at is null or p.sale_starts_at <= now())
        and (p.sale_ends_at is null or p.sale_ends_at > now())
       then p.sale_price_kobo else p.price_kobo end as effective_price_kobo,
  coalesce(v.variant_count, 0)::int as variant_count,
  case when p.type <> 'physical' then null
       when v.variant_count > 0 then v.variant_stock
       else coalesce(p.stock, 0) end as stock_total,
  p.low_stock_threshold,
  img.url as image_url, img.alt as image_alt,
  r.rating_avg, coalesce(r.rating_count, 0) as rating_count,
  p.sale_ends_at
from public.products p
join public.categories c on c.id = p.category_id
left join public.brands b on b.id = p.brand_id
left join v on v.product_id = p.id
left join img on img.product_id = p.id
left join r on r.product_id = p.id
where p.status = 'published';

grant select on public.catalog_products to anon, authenticated;

-- Search, filter, sort and paginate in one call.
create or replace function public.catalog_search(
  p_q text default null,
  p_category text default null,
  p_brands text[] default null,
  p_types public.product_type[] default null,
  p_conditions public.product_condition[] default null,
  p_min_kobo bigint default null,
  p_max_kobo bigint default null,
  p_in_stock boolean default false,
  p_on_sale boolean default false,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, sku text, name text, type public.product_type, condition public.product_condition,
  short_description text, category_slug text, category_name text, brand_slug text, brand_name text,
  price_kobo bigint, on_sale boolean, effective_price_kobo bigint, variant_count int, stock_total int,
  low_stock_threshold int, image_url text, image_alt text, rating_avg numeric, rating_count int,
  total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(trim(p_q), '') as term,
           case when nullif(trim(p_q), '') is null then null
                else websearch_to_tsquery('simple', trim(p_q)) end as tsq
  ), base as (
    select cp.*,
      case when q.term is null then 0
           else ts_rank(
                  to_tsvector('simple', cp.name || ' ' || cp.sku || ' ' || coalesce(cp.brand_name, '') || ' ' || cp.category_name || ' ' || coalesce(cp.short_description, '')),
                  q.tsq)
                + extensions.similarity(cp.name, q.term) end as rank
    from public.catalog_products cp, q
    where (q.term is null
           or to_tsvector('simple', cp.name || ' ' || cp.sku || ' ' || coalesce(cp.brand_name, '') || ' ' || cp.category_name || ' ' || coalesce(cp.short_description, '')) @@ q.tsq
           or cp.name ilike '%' || q.term || '%'
           or cp.sku ilike q.term || '%'
           or coalesce(cp.brand_name, '') ilike q.term || '%')
      and (p_category is null or cp.category_slug = p_category)
      and (p_brands is null or cp.brand_slug = any (p_brands))
      and (p_types is null or cp.type = any (p_types))
      and (p_conditions is null or cp.condition = any (p_conditions))
      and (p_min_kobo is null or cp.effective_price_kobo >= p_min_kobo)
      and (p_max_kobo is null or cp.effective_price_kobo <= p_max_kobo)
      and (not p_in_stock or cp.stock_total is null or cp.stock_total > 0)
      and (not p_on_sale or cp.on_sale)
  )
  select b.id, b.slug, b.sku, b.name, b.type, b.condition, b.short_description, b.category_slug, b.category_name,
         b.brand_slug, b.brand_name, b.price_kobo, b.on_sale, b.effective_price_kobo, b.variant_count, b.stock_total,
         b.low_stock_threshold, b.image_url, b.image_alt, b.rating_avg, b.rating_count,
         count(*) over () as total_count
  from base b
  order by
    case when p_sort = 'price_asc' then b.effective_price_kobo end asc nulls last,
    case when p_sort = 'price_desc' then b.effective_price_kobo end desc nulls last,
    case when p_sort = 'popular' then b.sold_count end desc nulls last,
    case when p_sort = 'relevance' then b.rank end desc nulls last,
    case when p_sort in ('relevance', 'popular') then b.is_featured::int end desc,
    b.published_at desc nulls last,
    b.id
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;
grant execute on function public.catalog_search(text, text, text[], public.product_type[], public.product_condition[], bigint, bigint, boolean, boolean, text, int, int) to anon, authenticated;

-- Filter options for a category (or the whole store)
create or replace function public.catalog_facets(p_category text default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.brand_slug, 'name', x.brand_name, 'count', x.n) order by x.brand_name)
      from (select cp.brand_slug, cp.brand_name, count(*) as n from public.catalog_products cp
            where cp.brand_slug is not null and (p_category is null or cp.category_slug = p_category)
            group by cp.brand_slug, cp.brand_name) x), '[]'::jsonb),
    'types', coalesce((
      select jsonb_agg(distinct cp.type) from public.catalog_products cp
      where p_category is null or cp.category_slug = p_category), '[]'::jsonb),
    'conditions', coalesce((
      select jsonb_agg(distinct cp.condition) from public.catalog_products cp
      where cp.condition is not null and (p_category is null or cp.category_slug = p_category)), '[]'::jsonb),
    'min_kobo', (select min(cp.effective_price_kobo) from public.catalog_products cp where p_category is null or cp.category_slug = p_category),
    'max_kobo', (select max(cp.effective_price_kobo) from public.catalog_products cp where p_category is null or cp.category_slug = p_category),
    'total', (select count(*) from public.catalog_products cp where p_category is null or cp.category_slug = p_category)
  );
$$;
grant execute on function public.catalog_facets(text) to anon, authenticated;
