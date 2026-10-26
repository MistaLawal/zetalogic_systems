-- Hardening: Supabase grants every privilege on new public tables to anon and
-- authenticated by default, leaving Row Level Security as the only guard.
-- Replace that with explicit, least-privilege grants (RLS still applies on top).
revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;

-- Public storefront reads
grant select on public.categories, public.brands, public.products, public.product_variants, public.product_images,
  public.product_reviews, public.store_settings, public.testimonials, public.blog_posts, public.shipping_zones,
  public.catalog_products to anon, authenticated;

-- Signed-in customers (RLS limits rows to their own)
grant select, update (full_name, phone) on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses, public.cart_items to authenticated;
grant select, insert, delete on public.wishlists to authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;

-- Staff (RLS checks roles)
grant select, insert, delete on public.user_roles to authenticated;
grant select on public.audit_logs, public.payment_transactions, public.payment_events, public.refunds,
  public.newsletter_subscriptions, public.coupons to authenticated;
grant insert, update, delete on public.categories, public.brands, public.products, public.product_variants,
  public.product_images, public.testimonials, public.blog_posts, public.shipping_zones, public.coupons to authenticated;
grant insert, update on public.store_settings to authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant update (status) on public.product_reviews, public.service_enquiries to authenticated;
grant select on public.service_enquiries to authenticated;
grant update (staff_note, needs_attention) on public.orders to authenticated;
