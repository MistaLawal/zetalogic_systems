-- Phase 2 / 2: product catalogue. All money is integer kobo (bigint).
create extension if not exists pg_trgm with schema extensions;

create type public.product_type as enum ('physical', 'downloadable', 'software');
create type public.product_condition as enum ('new', 'used', 'refurbished');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.inventory_reason as enum ('initial', 'restock', 'sale', 'return', 'adjustment', 'damaged');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 400),
  parent_id uuid references public.categories (id) on delete restrict,
  icon text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  seo_title text, seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text not null unique check (char_length(sku) between 2 and 64),
  name text not null check (char_length(name) between 2 and 200),
  type public.product_type not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  brand_id uuid references public.brands (id) on delete set null,
  short_description text check (char_length(short_description) <= 300),
  description text,
  price_kobo bigint not null check (price_kobo >= 0),
  sale_price_kobo bigint check (sale_price_kobo >= 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  -- Stock for products without variants; null = not stock-tracked (digital)
  stock int check (stock >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  condition public.product_condition,
  condition_notes text,              -- required disclosure for used/refurbished
  warranty_months int check (warranty_months >= 0),
  warranty_notes text,
  specs jsonb not null default '{}'::jsonb,   -- e.g. {"Processor":"Intel Core i5-1235U","RAM":"8GB"}
  system_requirements text,          -- software / downloads
  licence_type text,                 -- software: e.g. "Retail, 1 PC"
  licence_duration_months int check (licence_duration_months > 0),  -- null = perpetual
  licence_source text,               -- where the licence comes from (verified by staff)
  delivery_notes text,
  weight_grams int check (weight_grams >= 0),
  is_featured boolean not null default false,
  sold_count int not null default 0 check (sold_count >= 0),
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text, seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_below_price check (sale_price_kobo is null or sale_price_kobo < price_kobo),
  constraint sale_window check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at),
  constraint physical_has_condition check (type <> 'physical' or condition is not null),
  constraint used_needs_disclosure check (condition is null or condition = 'new' or char_length(coalesce(condition_notes, '')) >= 10),
  constraint digital_not_conditioned check (type = 'physical' or condition is null)
);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_status_published_idx on public.products (status, published_at desc);
create index products_featured_idx on public.products (is_featured) where status = 'published' and is_featured;
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_sku_trgm_idx on public.products using gin (sku extensions.gin_trgm_ops);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (char_length(sku) between 2 and 64),
  name text not null check (char_length(name) between 1 and 120),  -- e.g. "16GB / 512GB SSD"
  attributes jsonb not null default '{}'::jsonb,                    -- {"RAM":"16GB","Storage":"512GB SSD"}
  price_kobo bigint check (price_kobo >= 0),       -- null = use product price
  sale_price_kobo bigint check (sale_price_kobo >= 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variant_sale_below_price check (sale_price_kobo is null or price_kobo is null or sale_price_kobo < price_kobo)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null check (char_length(alt) between 3 and 200),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- Inventory ledger. Every stock change is a row; a trigger applies it.
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid references public.product_variants (id) on delete restrict,
  change int not null check (change <> 0),
  reason public.inventory_reason not null,
  reference text,
  note text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id);

create or replace function private.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.variant_id is not null then
    update public.product_variants set stock = stock + new.change
     where id = new.variant_id and product_id = new.product_id;
    if not found then raise exception 'Variant % does not belong to product %', new.variant_id, new.product_id; end if;
  else
    update public.products set stock = coalesce(stock, 0) + new.change where id = new.product_id;
  end if;
  return new;  -- stock >= 0 check constraints reject overselling
end $$;
revoke all on function private.apply_inventory_movement() from public;
create trigger inventory_movements_apply after insert on public.inventory_movements
  for each row execute function private.apply_inventory_movement();

-- Keep published_at in step with status
create or replace function private.products_publish_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;
create trigger products_publish_stamp before insert or update of status on public.products
  for each row execute function private.products_publish_stamp();

create trigger categories_updated_at before update on public.categories for each row execute function private.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function private.set_updated_at();
create trigger products_audit after insert or update or delete on public.products for each row execute function private.audit_row_change();
create trigger product_variants_audit after insert or update or delete on public.product_variants for each row execute function private.audit_row_change();

-- Reviews: shown only once approved. Customers can submit once purchase
-- eligibility exists (Phase 3 adds the insert policy tied to delivered orders).
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 2000),
  reviewer_name text not null check (char_length(reviewer_name) between 2 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index product_reviews_product_idx on public.product_reviews (product_id) where status = 'approved';
create index product_reviews_user_idx on public.product_reviews (user_id);

create table public.wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlists_product_idx on public.wishlists (product_id);


-- Creates insert/update/delete policies for catalogue staff on a table.
create or replace function private.create_staff_write_policies(tbl text, label text)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_catalog_staff()))', label || ' (insert)', tbl);
  execute format('create policy %I on public.%I for update to authenticated using ((select private.is_catalog_staff())) with check ((select private.is_catalog_staff()))', label || ' (update)', tbl);
  execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_catalog_staff()))', label || ' (delete)', tbl);
end $$;
revoke all on function private.create_staff_write_policies(text, text) from public;

-- ---------- RLS ----------
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.product_reviews enable row level security;
alter table public.wishlists enable row level security;

create policy "Anyone reads active categories" on public.categories for select to anon, authenticated
  using (is_active or (select private.is_catalog_staff()));
select private.create_staff_write_policies('categories', 'Staff manage categories');

create policy "Anyone reads brands" on public.brands for select to anon, authenticated using (true);
select private.create_staff_write_policies('brands', 'Staff manage brands');

create policy "Anyone reads published products" on public.products for select to anon, authenticated
  using (status = 'published' or (select private.is_catalog_staff()));
select private.create_staff_write_policies('products', 'Staff manage products');

create policy "Anyone reads variants of published products" on public.product_variants for select to anon, authenticated
  using ((is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')) or (select private.is_catalog_staff()));
select private.create_staff_write_policies('product_variants', 'Staff manage variants');

create policy "Anyone reads images of published products" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published') or (select private.is_catalog_staff()));
select private.create_staff_write_policies('product_images', 'Staff manage images');

create policy "Staff read inventory" on public.inventory_movements for select to authenticated
  using ((select private.has_any_role(array['super_admin','store_manager','order_manager']::public.app_role[])));
create policy "Staff record inventory" on public.inventory_movements for insert to authenticated
  with check ((select private.is_catalog_staff()) and created_by = (select auth.uid()));

create policy "Anyone reads approved reviews" on public.product_reviews for select to anon, authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or (select private.has_any_role(array['super_admin','content_manager','customer_support']::public.app_role[])));
create policy "Moderators update reviews" on public.product_reviews for update to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])))
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));

create policy "Users read own wishlist" on public.wishlists for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add to own wishlist" on public.wishlists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove from own wishlist" on public.wishlists for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.categories, public.brands, public.products, public.product_variants, public.product_images, public.product_reviews to anon, authenticated;
grant insert, update, delete on public.categories, public.brands, public.products, public.product_variants, public.product_images to authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant update (status) on public.product_reviews to authenticated;
grant select, insert, delete on public.wishlists to authenticated;
