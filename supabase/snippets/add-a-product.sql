-- Template: add a real product until the admin dashboard arrives in Phase 5.
-- Run in Supabase Dashboard > SQL Editor. Replace every <...> value.
-- Prices are in KOBO: ₦250,000.00 = 25000000.

-- 1) Brand (skip if it already exists)
insert into public.brands (slug, name) values ('<hp>', '<HP>') on conflict (slug) do nothing;

-- 2) Product
insert into public.products (
  slug, sku, name, type, category_id, brand_id,
  short_description, description,
  price_kobo, sale_price_kobo,            -- sale price optional, must be lower than price
  stock,                                  -- physical only; leave null for digital
  condition, condition_notes,             -- physical only; notes required for used/refurbished
  warranty_months, warranty_notes,
  specs,                                  -- shown as the specifications table
  is_featured, status                     -- status 'published' makes it visible
) values (
  '<hp-elitebook-840-g8-i5>', '<HP-840G8-I5>', '<HP EliteBook 840 G8, Core i5, 14">', 'physical',
  (select id from public.categories where slug = '<used-refurbished-laptops>'),
  (select id from public.brands where slug = '<hp>'),
  '<One-line summary shown on cards>', '<Full description>',
  <45000000>, null,
  null,                                   -- set stock with an inventory movement below
  '<refurbished>', '<Light scratches on lid. Battery health 91%. Charger included.>',
  <3>, '<Covers hardware faults; excludes physical damage.>',
  '{"Processor":"<Intel Core i5-1135G7>","RAM":"<8GB>","Storage":"<256GB SSD>","Display":"<14-inch FHD>"}',
  false, 'published'
);

-- 3) Opening stock (keeps an audit trail of every stock change)
insert into public.inventory_movements (product_id, change, reason, note)
select id, <5>, 'initial', 'Opening stock' from public.products where sku = '<HP-840G8-I5>';

-- 4) Photos: upload to Storage bucket "product-images", then:
insert into public.product_images (product_id, url, alt, sort_order)
select id, '<https://ysfefuyefmjjxphpcoxi.supabase.co/storage/v1/object/public/product-images/hp-840-front.webp>', '<HP EliteBook 840 G8 front view>', 0
from public.products where sku = '<HP-840G8-I5>';

-- Optional: variants (each with its own SKU, stock and optional price)
-- insert into public.product_variants (product_id, sku, name, attributes, price_kobo, stock)
-- select id, 'HP-840G8-I5-16', '16GB / 512GB', '{"RAM":"16GB","Storage":"512GB SSD"}', 48000000, 2 from public.products where sku = 'HP-840G8-I5';
