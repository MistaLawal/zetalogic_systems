-- Give the store owner full admin rights. Sign up on the website first,
-- then run this once in Supabase Dashboard > SQL Editor.
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = '<owner@example.com>'
on conflict do nothing;
