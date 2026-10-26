-- Phase 3: carts, delivery, coupons, orders, payments, refunds.
-- Money is integer kobo throughout. Prices are always recomputed on the server.

create type public.payment_status as enum ('unpaid', 'awaiting_transfer', 'paid', 'failed', 'refunded', 'partially_refunded');
create type public.fulfilment_status as enum ('unfulfilled', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled');
create type public.payment_method as enum ('paystack', 'bank_transfer');

-- ---------- Delivery ----------
create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 200),
  states text[] not null default '{}',          -- empty = every state
  fee_kobo bigint not null default 0 check (fee_kobo >= 0),
  eta text check (char_length(eta) <= 80),
  requires_address boolean not null default true, -- false for pickup
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger shipping_zones_updated_at before update on public.shipping_zones for each row execute function private.set_updated_at();
create trigger shipping_zones_audit after insert or update or delete on public.shipping_zones for each row execute function private.audit_row_change();

-- ---------- Coupons ----------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text,
  kind text not null check (kind in ('percent', 'fixed')),
  value bigint not null check (value > 0),          -- percent: 1-100, fixed: kobo
  min_order_kobo bigint not null default 0 check (min_order_kobo >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int check (max_uses > 0),
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint percent_range check (kind <> 'percent' or value between 1 and 100)
);
create trigger coupons_audit after insert or update or delete on public.coupons for each row execute function private.audit_row_change();

-- ---------- Carts (signed-in customers) ----------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity int not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index cart_items_unique_line on public.cart_items (user_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index cart_items_product_idx on public.cart_items (product_id);
create index cart_items_variant_idx on public.cart_items (variant_id);
create trigger cart_items_updated_at before update on public.cart_items for each row execute function private.set_updated_at();

-- ---------- Orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  access_token uuid not null default gen_random_uuid(),  -- lets guests view their order
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone text not null check (char_length(phone) between 7 and 20),
  full_name text not null check (char_length(full_name) between 2 and 120),
  -- delivery snapshot
  shipping_zone_id uuid references public.shipping_zones (id) on delete set null,
  delivery_method text,
  ship_line1 text, ship_line2 text, ship_city text, ship_state text, ship_landmark text,
  -- money (kobo)
  subtotal_kobo bigint not null check (subtotal_kobo >= 0),
  discount_kobo bigint not null default 0 check (discount_kobo >= 0),
  delivery_fee_kobo bigint not null default 0 check (delivery_fee_kobo >= 0),
  total_kobo bigint not null check (total_kobo >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  coupon_code text,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  fulfilment_status public.fulfilment_status not null default 'unfulfilled',
  needs_attention boolean not null default false,
  customer_note text check (char_length(customer_note) <= 1000),
  staff_note text,
  carrier text, tracking_number text,
  paid_at timestamptz, shipped_at timestamptz, delivered_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint total_adds_up check (total_kobo = subtotal_kobo - discount_kobo + delivery_fee_kobo)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (payment_status, fulfilment_status);
create index orders_zone_idx on public.orders (shipping_zone_id);
create trigger orders_updated_at before update on public.orders for each row execute function private.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- snapshot at time of purchase
  product_name text not null,
  variant_name text,
  sku text not null,
  product_type public.product_type not null,
  condition public.product_condition,
  attributes jsonb not null default '{}'::jsonb,
  unit_price_kobo bigint not null check (unit_price_kobo >= 0),
  quantity int not null check (quantity between 1 and 10),
  line_total_kobo bigint not null,
  constraint line_adds_up check (line_total_kobo = unit_price_kobo * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  title text not null,
  detail text,
  customer_visible boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);
create index order_events_created_by_idx on public.order_events (created_by);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('paystack', 'bank_transfer')),
  reference text not null unique,
  amount_kobo bigint not null,
  currency text not null default 'NGN',
  status text not null default 'initialized' check (status in ('initialized', 'success', 'failed', 'abandoned', 'amount_mismatch', 'reversed')),
  channel text,
  provider_response jsonb,
  verified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_transactions_order_idx on public.payment_transactions (order_id);
create index payment_transactions_created_by_idx on public.payment_transactions (created_by);
create trigger payment_transactions_updated_at before update on public.payment_transactions for each row execute function private.set_updated_at();

-- Raw webhook log (audit trail; signature result recorded)
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event text,
  reference text,
  signature_valid boolean not null,
  processed boolean not null default false,
  result text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index payment_events_reference_idx on public.payment_events (reference);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  provider_reference text,
  restocked boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);
create index refunds_created_by_idx on public.refunds (created_by);

-- ---------- Helpers ----------
create or replace function private.is_order_staff()
returns boolean language sql stable set search_path = '' as $$
  select private.has_any_role(array['super_admin', 'order_manager']::public.app_role[]);
$$;
revoke all on function private.is_order_staff() from public;
grant execute on function private.is_order_staff() to anon, authenticated;

-- Effective unit price for a product/variant right now (kobo)
create or replace function private.unit_price(p public.products, v public.product_variants)
returns bigint language sql stable set search_path = '' as $$
  select case
    when v.id is not null and v.price_kobo is not null then
      case when v.sale_price_kobo is not null and v.sale_price_kobo < v.price_kobo then v.sale_price_kobo else v.price_kobo end
    when p.sale_price_kobo is not null
         and (p.sale_starts_at is null or p.sale_starts_at <= now())
         and (p.sale_ends_at is null or p.sale_ends_at > now()) then p.sale_price_kobo
    else p.price_kobo end;
$$;

-- Price a cart and validate it. Used by checkout (server) and for previews.
-- Raises errors whose message starts with a code the client can map.
create or replace function private.price_cart(p_items jsonb, p_zone_id uuid, p_coupon text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  it jsonb; p public.products; v public.product_variants; z public.shipping_zones; c public.coupons;
  qty int; price bigint; lines jsonb := '[]'::jsonb; subtotal bigint := 0; has_physical boolean := false;
  discount bigint := 0; fee bigint := 0; avail int; has_variants boolean; n int := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'TOO_MANY_ITEMS'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    n := n + 1;
    qty := (it ->> 'quantity')::int;
    if qty is null or qty < 1 or qty > 10 then raise exception 'BAD_QUANTITY'; end if;
    select * into p from public.products where id = (it ->> 'product_id')::uuid and status = 'published';
    if not found then raise exception 'UNAVAILABLE:%', coalesce(it ->> 'product_id', '?'); end if;
    select exists (select 1 from public.product_variants where product_id = p.id and is_active) into has_variants;
    v := null;
    if nullif(it ->> 'variant_id', '') is not null then
      select * into v from public.product_variants where id = (it ->> 'variant_id')::uuid and product_id = p.id and is_active;
      if not found then raise exception 'UNAVAILABLE:%', p.name; end if;
    elsif has_variants then
      raise exception 'CHOOSE_OPTION:%', p.name;
    end if;
    if p.type = 'physical' then
      has_physical := true;
      avail := case when v.id is not null then v.stock else coalesce(p.stock, 0) end;
      if avail < qty then raise exception 'OUT_OF_STOCK:%|%', p.name || coalesce(' (' || v.name || ')', ''), avail; end if;
    end if;
    price := private.unit_price(p, v);
    subtotal := subtotal + price * qty;
    lines := lines || jsonb_build_object(
      'product_id', p.id, 'variant_id', v.id, 'product_name', p.name, 'variant_name', v.name,
      'sku', coalesce(v.sku, p.sku), 'product_type', p.type, 'condition', p.condition,
      'attributes', coalesce(v.attributes, '{}'::jsonb), 'unit_price_kobo', price, 'quantity', qty,
      'line_total_kobo', price * qty);
  end loop;

  if has_physical then
    if p_zone_id is null then raise exception 'CHOOSE_DELIVERY'; end if;
    select * into z from public.shipping_zones where id = p_zone_id and is_active;
    if not found then raise exception 'CHOOSE_DELIVERY'; end if;
    fee := z.fee_kobo;
  end if;

  if nullif(trim(p_coupon), '') is not null then
    select * into c from public.coupons where code = upper(trim(p_coupon)) and is_active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
      and (max_uses is null or used_count < max_uses);
    if not found then raise exception 'BAD_COUPON'; end if;
    if subtotal < c.min_order_kobo then raise exception 'COUPON_MINIMUM:%', c.min_order_kobo; end if;
    discount := case when c.kind = 'percent' then (subtotal * c.value) / 100 else least(c.value, subtotal) end;
  end if;

  return jsonb_build_object(
    'lines', lines, 'subtotal_kobo', subtotal, 'discount_kobo', discount, 'delivery_fee_kobo', fee,
    'total_kobo', subtotal - discount + fee, 'has_physical', has_physical,
    'zone', case when z.id is null then null else jsonb_build_object('id', z.id, 'name', z.name, 'requires_address', z.requires_address, 'eta', z.eta) end,
    'coupon_code', c.code);
end $$;
revoke all on function private.price_cart(jsonb, uuid, text) from public;

-- Public quote for the checkout page (no writes; respects published-only)
create or replace function public.quote_cart(p_items jsonb, p_zone_id uuid default null, p_coupon text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.price_cart(p_items, p_zone_id, p_coupon);
$$;
revoke all on function public.quote_cart(jsonb, uuid, text) from public;
grant execute on function public.quote_cart(jsonb, uuid, text) to anon, authenticated;

-- Create an order. Only the checkout Edge Function (service role) may call this.
create or replace function public.create_order_internal(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare q jsonb; o public.orders; line jsonb; num text; tries int := 0;
begin
  q := private.price_cart(p -> 'items', nullif(p ->> 'zone_id', '')::uuid, p ->> 'coupon_code');
  if (q ->> 'has_physical')::boolean and coalesce((q -> 'zone' ->> 'requires_address')::boolean, true)
     and (coalesce(trim(p ->> 'line1'), '') = '' or coalesce(trim(p ->> 'city'), '') = '' or coalesce(trim(p ->> 'state'), '') = '') then
    raise exception 'ADDRESS_REQUIRED';
  end if;
  if (q ->> 'has_physical')::boolean and exists (
       select 1 from public.shipping_zones z where z.id = (q -> 'zone' ->> 'id')::uuid
       and z.requires_address and cardinality(z.states) > 0 and not (trim(p ->> 'state') = any (z.states))) then
    raise exception 'ZONE_STATE';
  end if;
  loop
    num := 'ZLS-' || to_char(now() at time zone 'Africa/Lagos', 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    exit when not exists (select 1 from public.orders where order_number = num);
    tries := tries + 1; if tries > 5 then raise exception 'ORDER_NUMBER'; end if;
  end loop;
  insert into public.orders (
    order_number, user_id, email, phone, full_name, shipping_zone_id, delivery_method,
    ship_line1, ship_line2, ship_city, ship_state, ship_landmark,
    subtotal_kobo, discount_kobo, delivery_fee_kobo, total_kobo, coupon_code, payment_method, payment_status, customer_note)
  values (
    num, nullif(p ->> 'user_id', '')::uuid, lower(trim(p ->> 'email')), trim(p ->> 'phone'), trim(p ->> 'full_name'),
    (q -> 'zone' ->> 'id')::uuid, q -> 'zone' ->> 'name',
    nullif(trim(p ->> 'line1'), ''), nullif(trim(p ->> 'line2'), ''), nullif(trim(p ->> 'city'), ''), nullif(trim(p ->> 'state'), ''), nullif(trim(p ->> 'landmark'), ''),
    (q ->> 'subtotal_kobo')::bigint, (q ->> 'discount_kobo')::bigint, (q ->> 'delivery_fee_kobo')::bigint, (q ->> 'total_kobo')::bigint,
    q ->> 'coupon_code', (p ->> 'payment_method')::public.payment_method,
    case when p ->> 'payment_method' = 'bank_transfer' then 'awaiting_transfer'::public.payment_status else 'unpaid'::public.payment_status end,
    nullif(left(trim(p ->> 'note'), 1000), ''))
  returning * into o;
  for line in select * from jsonb_array_elements(q -> 'lines') loop
    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, sku, product_type, condition, attributes, unit_price_kobo, quantity, line_total_kobo)
    values (o.id, (line ->> 'product_id')::uuid, nullif(line ->> 'variant_id', '')::uuid, line ->> 'product_name', line ->> 'variant_name', line ->> 'sku',
            (line ->> 'product_type')::public.product_type, nullif(line ->> 'condition', '')::public.product_condition, line -> 'attributes',
            (line ->> 'unit_price_kobo')::bigint, (line ->> 'quantity')::int, (line ->> 'line_total_kobo')::bigint);
  end loop;
  insert into public.order_events (order_id, title, detail) values
    (o.id, 'Order placed', case when o.payment_method = 'bank_transfer' then 'Waiting for your bank transfer.' else 'Waiting for payment.' end);
  return jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'total_kobo', o.total_kobo, 'access_token', o.access_token, 'email', o.email);
end $$;
revoke all on function public.create_order_internal(jsonb) from public, anon, authenticated;
grant execute on function public.create_order_internal(jsonb) to service_role;

-- Apply a confirmed payment: idempotent, locks the order, deducts stock.
create or replace function private.apply_payment(p_tx_id uuid, p_amount bigint, p_currency text, p_channel text, p_response jsonb, p_actor uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare t public.payment_transactions; o public.orders; it public.order_items;
begin
  select * into t from public.payment_transactions where id = p_tx_id for update;
  select * into o from public.orders where id = t.order_id for update;
  if o.payment_status = 'paid' then return 'already_paid'; end if;
  if p_amount <> o.total_kobo or upper(p_currency) <> 'NGN' then
    update public.payment_transactions set status = 'amount_mismatch', provider_response = p_response, verified_at = now() where id = t.id;
    update public.orders set needs_attention = true where id = o.id;
    insert into public.order_events (order_id, title, detail, customer_visible) values
      (o.id, 'Payment amount mismatch', format('Received %s %s, expected %s NGN kobo. Check before fulfilling.', p_amount, p_currency, o.total_kobo), false);
    return 'amount_mismatch';
  end if;
  update public.payment_transactions set status = 'success', channel = p_channel, provider_response = p_response, verified_at = now() where id = t.id;
  update public.orders set payment_status = 'paid', paid_at = now(),
    fulfilment_status = case when fulfilment_status = 'unfulfilled' then 'processing'::public.fulfilment_status else fulfilment_status end
  where id = o.id;
  insert into public.order_events (order_id, title, detail, created_by) values
    (o.id, 'Payment confirmed', case when t.provider = 'bank_transfer' then 'Bank transfer received.' else 'Paid online' || coalesce(' by ' || p_channel, '') || '.' end, p_actor);
  for it in select * from public.order_items where order_id = o.id loop
    if it.product_id is not null then
      update public.products set sold_count = sold_count + it.quantity where id = it.product_id;
    end if;
    if it.product_type = 'physical' and it.product_id is not null then
      begin
        insert into public.inventory_movements (product_id, variant_id, change, reason, reference, created_by)
        values (it.product_id, it.variant_id, -it.quantity, 'sale', o.order_number, p_actor);
      exception when check_violation then
        update public.orders set needs_attention = true where id = o.id;
        insert into public.order_events (order_id, title, detail, customer_visible) values
          (o.id, 'Stock shortfall', format('Not enough stock recorded for %s. Paid order needs manual review.', it.product_name), false);
      end;
    end if;
  end loop;
  if o.coupon_code is not null then update public.coupons set used_count = used_count + 1 where code = o.coupon_code; end if;
  return 'paid';
end $$;
revoke all on function private.apply_payment(uuid, bigint, text, text, jsonb, uuid) from public;

-- Called by the Paystack webhook / verify functions (service role only)
create or replace function public.record_paystack_result_internal(p_reference text, p_status text, p_amount bigint, p_currency text, p_channel text, p_response jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare t public.payment_transactions;
begin
  select * into t from public.payment_transactions where reference = p_reference and provider = 'paystack';
  if not found then return 'unknown_reference'; end if;
  if p_status = 'success' then
    return private.apply_payment(t.id, p_amount, p_currency, p_channel, p_response, null);
  elsif t.status = 'initialized' and p_status in ('failed', 'abandoned', 'reversed') then
    update public.payment_transactions set status = p_status, provider_response = p_response, verified_at = now() where id = t.id;
    if p_status = 'failed' then
      update public.orders set payment_status = 'failed' where id = t.order_id and payment_status = 'unpaid';
      insert into public.order_events (order_id, title, detail) values (t.order_id, 'Payment failed', 'The payment did not go through. You can try again.');
    end if;
    return p_status;
  end if;
  return 'ignored';
end $$;
revoke all on function public.record_paystack_result_internal(text, text, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_paystack_result_internal(text, text, bigint, text, text, jsonb) to service_role;

-- Staff: confirm a manual bank transfer
create or replace function public.admin_confirm_transfer(p_order_id uuid, p_amount_kobo bigint, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare o public.orders; tx uuid;
begin
  if not private.is_order_staff() then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.payment_method <> 'bank_transfer' then raise exception 'NOT_BANK_TRANSFER'; end if;
  if o.payment_status = 'paid' then return 'already_paid'; end if;
  insert into public.payment_transactions (order_id, provider, reference, amount_kobo, status, created_by, provider_response)
  values (o.id, 'bank_transfer', 'TRF-' || o.order_number || '-' || to_char(now(), 'HH24MISS'), p_amount_kobo, 'initialized', auth.uid(), jsonb_build_object('note', p_note))
  returning id into tx;
  return private.apply_payment(tx, p_amount_kobo, 'NGN', 'bank_transfer', jsonb_build_object('note', p_note), auth.uid());
end $$;
revoke all on function public.admin_confirm_transfer(uuid, bigint, text) from public, anon;
grant execute on function public.admin_confirm_transfer(uuid, bigint, text) to authenticated;

-- Staff: update fulfilment with a customer-visible timeline entry
create or replace function public.admin_update_fulfilment(p_order_id uuid, p_status public.fulfilment_status, p_carrier text default null, p_tracking text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders; it public.order_items; label text;
begin
  if not private.is_order_staff() then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_status = 'cancelled' and o.fulfilment_status in ('shipped', 'delivered') then raise exception 'ALREADY_SHIPPED'; end if;
  if p_status in ('shipped', 'delivered', 'ready_for_pickup') and o.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  update public.orders set fulfilment_status = p_status,
    carrier = coalesce(nullif(trim(p_carrier), ''), carrier), tracking_number = coalesce(nullif(trim(p_tracking), ''), tracking_number),
    shipped_at = case when p_status = 'shipped' then now() else shipped_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = o.id;
  -- Cancelling a paid order returns its stock
  if p_status = 'cancelled' and o.payment_status = 'paid' and o.fulfilment_status <> 'cancelled' then
    for it in select * from public.order_items where order_id = o.id and product_type = 'physical' and product_id is not null loop
      insert into public.inventory_movements (product_id, variant_id, change, reason, reference, created_by)
      values (it.product_id, it.variant_id, it.quantity, 'return', o.order_number, auth.uid());
    end loop;
  end if;
  label := case p_status when 'processing' then 'Preparing your order' when 'ready_for_pickup' then 'Ready for pickup'
    when 'shipped' then 'On the way' when 'delivered' then 'Delivered' when 'cancelled' then 'Order cancelled' else 'Order updated' end;
  insert into public.order_events (order_id, title, detail, created_by) values
    (o.id, label, nullif(concat_ws(' · ', nullif(trim(p_note), ''), case when nullif(trim(p_tracking), '') is not null then coalesce(nullif(trim(p_carrier), '') || ' ', '') || 'tracking ' || trim(p_tracking) end), ''), auth.uid());
end $$;
revoke all on function public.admin_update_fulfilment(uuid, public.fulfilment_status, text, text, text) from public, anon;
grant execute on function public.admin_update_fulfilment(uuid, public.fulfilment_status, text, text, text) to authenticated;

-- Staff: record a refund (money is returned in the Paystack dashboard or by transfer)
create or replace function public.admin_record_refund(p_order_id uuid, p_amount_kobo bigint, p_reason text, p_restock boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders; refunded bigint; it public.order_items;
begin
  if not private.is_order_staff() then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if o.payment_status not in ('paid', 'partially_refunded') then raise exception 'NOT_PAID'; end if;
  select coalesce(sum(amount_kobo), 0) into refunded from public.refunds where order_id = o.id and status <> 'failed';
  if p_amount_kobo <= 0 or refunded + p_amount_kobo > o.total_kobo then raise exception 'BAD_AMOUNT'; end if;
  insert into public.refunds (order_id, amount_kobo, reason, status, restocked, created_by) values (o.id, p_amount_kobo, p_reason, 'processed', p_restock, auth.uid());
  update public.orders set payment_status = case when refunded + p_amount_kobo = o.total_kobo then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end where id = o.id;
  if p_restock then
    for it in select * from public.order_items where order_id = o.id and product_type = 'physical' and product_id is not null loop
      insert into public.inventory_movements (product_id, variant_id, change, reason, reference, created_by)
      values (it.product_id, it.variant_id, it.quantity, 'return', o.order_number, auth.uid());
    end loop;
  end if;
  insert into public.order_events (order_id, title, detail, created_by) values (o.id, 'Refund issued', format('₦%s refunded. %s', to_char(p_amount_kobo / 100.0, 'FM999,999,990.00'), p_reason), auth.uid());
end $$;
revoke all on function public.admin_record_refund(uuid, bigint, text, boolean) from public, anon;
grant execute on function public.admin_record_refund(uuid, bigint, text, boolean) to authenticated;

-- Staff: delete a product only if it has never been ordered; otherwise archive it.
create or replace function public.admin_delete_product(p_product_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_catalog_staff() then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from public.order_items where product_id = p_product_id) then
    update public.products set status = 'archived', is_featured = false where id = p_product_id;
    return 'archived';
  end if;
  delete from public.inventory_movements where product_id = p_product_id;
  delete from public.products where id = p_product_id;
  return 'deleted';
end $$;
revoke all on function public.admin_delete_product(uuid) from public, anon;
grant execute on function public.admin_delete_product(uuid) to authenticated;

-- ---------- RLS ----------
alter table public.shipping_zones enable row level security;
alter table public.coupons enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;

create policy "Anyone reads active delivery options" on public.shipping_zones for select to anon, authenticated
  using (is_active or (select private.is_catalog_staff()) or (select private.is_order_staff()));
select private.create_staff_write_policies('shipping_zones', 'Staff manage delivery options');

create policy "Staff read coupons" on public.coupons for select to authenticated using ((select private.is_catalog_staff()));
select private.create_staff_write_policies('coupons', 'Staff manage coupons');

create policy "Users read own cart" on public.cart_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add to own cart" on public.cart_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change own cart" on public.cart_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove from own cart" on public.cart_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Customers and staff read orders" on public.orders for select to authenticated
  using ((select auth.uid()) = user_id or (select private.has_any_role(array['super_admin','order_manager','customer_support','store_manager']::public.app_role[])));
create policy "Staff edit order notes" on public.orders for update to authenticated
  using ((select private.is_order_staff())) with check ((select private.is_order_staff()));

create policy "Read items of visible orders" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "Read events of visible orders" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id) and (customer_visible or (select private.has_any_role(array['super_admin','order_manager','customer_support','store_manager']::public.app_role[]))));
create policy "Staff read payments" on public.payment_transactions for select to authenticated using ((select private.is_order_staff()));
create policy "Super admins read webhook log" on public.payment_events for select to authenticated using ((select private.has_any_role(array['super_admin']::public.app_role[])));
create policy "Staff read refunds" on public.refunds for select to authenticated using ((select private.is_order_staff()));

grant select on public.shipping_zones to anon, authenticated;
grant insert, update, delete on public.shipping_zones, public.coupons to authenticated;
grant select on public.coupons to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select on public.orders, public.order_items, public.order_events, public.payment_transactions, public.payment_events, public.refunds to authenticated;
grant update (staff_note, needs_attention) on public.orders to authenticated;

-- ---------- Seed: delivery options and payment settings ----------
-- Fees are left at zero and inactive until the owner sets real prices in /admin.
insert into public.shipping_zones (name, description, states, fee_kobo, eta, requires_address, is_active, sort_order) values
  ('Pickup in Ikorodu', 'Collect from our Ikorodu office. We will message you when your order is ready.', '{}', 0, 'Ready in 1 working day', false, true, 0),
  ('Delivery within Lagos', 'Delivered to your address in Lagos State.', '{Lagos}', 0, '1–2 working days', true, false, 1),
  ('Delivery outside Lagos', 'Delivered nationwide by courier.', '{}', 0, '3–5 working days', true, false, 2);

insert into public.store_settings (key, value, is_public) values
  ('bank_transfer', '{"enabled": false, "bank_name": "", "account_name": "", "account_number": ""}', true)
on conflict (key) do nothing;
