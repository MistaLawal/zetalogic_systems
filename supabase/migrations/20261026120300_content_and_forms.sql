-- Phase 2 / 4: site content, settings, enquiries and newsletter
create table public.store_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger store_settings_updated_at before update on public.store_settings for each row execute function private.set_updated_at();
create trigger store_settings_audit after insert or update or delete on public.store_settings for each row execute function private.audit_row_change();

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(quote) between 10 and 600),
  name text not null check (char_length(name) between 2 and 80),
  context text check (char_length(context) <= 120),
  verified_note text,                       -- internal: how it was verified
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 5 and 160),
  excerpt text check (char_length(excerpt) <= 300),
  body text not null default '',
  topic text not null check (topic in ('Laptop buying guides','Software','Cybersecurity','Business automation','Web development','Tech tips')),
  cover_url text, cover_alt text,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references auth.users (id) on delete set null,
  seo_title text, seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_published_idx on public.blog_posts (published_at desc) where status = 'published';
create index blog_posts_author_idx on public.blog_posts (author_id);
create trigger blog_posts_updated_at before update on public.blog_posts for each row execute function private.set_updated_at();

create table public.service_enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone text not null check (char_length(phone) between 7 and 20),
  business_name text check (char_length(business_name) <= 160),
  service text not null check (char_length(service) <= 120),
  budget_kobo bigint check (budget_kobo >= 0),
  description text not null check (char_length(description) between 20 and 5000),
  contact_method text not null check (contact_method in ('Phone call', 'WhatsApp', 'Email')),
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  user_id uuid references auth.users (id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_enquiries_created_idx on public.service_enquiries (created_at desc);
create index service_enquiries_ip_idx on public.service_enquiries (ip_hash, created_at desc);
create index service_enquiries_user_idx on public.service_enquiries (user_id);
create trigger service_enquiries_updated_at before update on public.service_enquiries for each row execute function private.set_updated_at();

create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  consent_text text not null,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index newsletter_ip_idx on public.newsletter_subscriptions (ip_hash, created_at desc);

alter table public.store_settings enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_posts enable row level security;
alter table public.service_enquiries enable row level security;
alter table public.newsletter_subscriptions enable row level security;

create policy "Anyone reads public settings" on public.store_settings for select to anon, authenticated
  using (is_public or (select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Admins write settings (insert)" on public.store_settings for insert to authenticated
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Admins write settings (update)" on public.store_settings for update to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])))
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));

create policy "Anyone reads published testimonials" on public.testimonials for select to anon, authenticated
  using (is_published or (select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Content team writes testimonials (insert)" on public.testimonials for insert to authenticated
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Content team writes testimonials (update)" on public.testimonials for update to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])))
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Content team writes testimonials (delete)" on public.testimonials for delete to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));

create policy "Anyone reads published posts" on public.blog_posts for select to anon, authenticated
  using (status = 'published' or (select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Content team writes posts (insert)" on public.blog_posts for insert to authenticated
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Content team writes posts (update)" on public.blog_posts for update to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])))
  with check ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));
create policy "Content team writes posts (delete)" on public.blog_posts for delete to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));

-- Enquiries and subscriptions are inserted only by Edge Functions (secret key).
create policy "Staff read enquiries" on public.service_enquiries for select to authenticated
  using ((select private.has_any_role(array['super_admin','customer_support','store_manager']::public.app_role[])));
create policy "Staff update enquiries" on public.service_enquiries for update to authenticated
  using ((select private.has_any_role(array['super_admin','customer_support','store_manager']::public.app_role[])))
  with check ((select private.has_any_role(array['super_admin','customer_support','store_manager']::public.app_role[])));
create policy "Staff read subscribers" on public.newsletter_subscriptions for select to authenticated
  using ((select private.has_any_role(array['super_admin','content_manager']::public.app_role[])));

grant select on public.store_settings, public.testimonials, public.blog_posts to anon, authenticated;
grant insert, update on public.store_settings to authenticated;
grant insert, update, delete on public.testimonials, public.blog_posts to authenticated;
grant select, update (status) on public.service_enquiries to authenticated;
grant select on public.newsletter_subscriptions to authenticated;

-- Initial public settings (editable from the admin dashboard in Phase 5)
insert into public.store_settings (key, value, is_public) values
  ('announcement', '{"enabled": true, "text": "Need a laptop recommendation? Tell us your budget and work on WhatsApp and we will suggest options.", "link_label": "Chat with us"}', true),
  ('business_hours', '[{"days":"Monday – Friday","time":"9:00am – 6:00pm"},{"days":"Saturday","time":"10:00am – 4:00pm"},{"days":"Sunday","time":"Closed"}]', true),
  ('socials', '{"instagram":"","linkedin":"","x":"","facebook":""}', true);

-- Product categories from the brief
insert into public.categories (slug, name, description, icon, sort_order) values
  ('new-laptops', 'New Laptops', 'Sealed machines for work, study and design, with manufacturer warranty.', 'laptop', 1),
  ('used-refurbished-laptops', 'Used & Refurbished Laptops', 'Tested devices with the condition, battery health and warranty stated up front.', 'refurb', 2),
  ('computer-accessories', 'Computer Accessories', 'Chargers, keyboards, mice, storage, bags and everyday add-ons.', 'mouse', 3),
  ('software-licences', 'Software & Licences', 'Productivity, security and business software with activation guidance.', 'key', 4),
  ('digital-products', 'Digital Products', 'Excel tools, templates, guides and business documents to download.', 'download', 5),
  ('networking-it-equipment', 'Networking & IT Equipment', 'Routers, switches, cabling and kit for reliable office networks.', 'network', 6);
