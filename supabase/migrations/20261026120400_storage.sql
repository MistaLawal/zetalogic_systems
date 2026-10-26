-- Phase 2 / 5: public bucket for product and content images (staff upload only).
-- Private downloadable files get a separate private bucket in Phase 4.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy "Staff upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.has_any_role(array['super_admin','store_manager','content_manager']::public.app_role[])));
create policy "Staff read product images" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select private.has_any_role(array['super_admin','store_manager','content_manager']::public.app_role[])));
create policy "Staff replace product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select private.has_any_role(array['super_admin','store_manager','content_manager']::public.app_role[])))
  with check (bucket_id = 'product-images' and (select private.has_any_role(array['super_admin','store_manager','content_manager']::public.app_role[])));
create policy "Staff delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select private.has_any_role(array['super_admin','store_manager','content_manager']::public.app_role[])));
