-- Migration 12b: Admin role implementation
-- Runs after 20240012000000 committed 'admin' to user_role enum.
-- Now 'admin'::user_role casts are safe.

-- 1. Recreate handle_new_user trigger with admin code check
--    Blindado: cualquier error → profile creado como renter
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_admin_code text;
  v_secret_code text;
begin
  v_admin_code := new.raw_user_meta_data ->> 'admin_code';

  begin
    v_secret_code := (SELECT value FROM _settings WHERE key = 'admin_secret_code');
  exception when others then
    v_secret_code := null;
  end;

  if v_admin_code is not null and v_secret_code is not null and v_admin_code = v_secret_code then
    v_role := 'admin'::user_role;
  else
    begin
      v_role := coalesce(
        (new.raw_user_meta_data ->> 'role')::user_role,
        'renter'::user_role
      );
    exception when others then
      v_role := 'renter'::user_role;
    end;
  end if;

  insert into profiles (id, full_name, role, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    nullif(new.raw_user_meta_data ->> 'business_name', '')
  );

  return new;
end;
$$ language plpgsql;

-- 2. Admin RLS policies on profiles
drop policy if exists "profiles_read_all" on profiles;
create policy "profiles_read_all" on profiles
  for select using (
    auth.role() is not null
  );

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Admin RLS policies on bookings
drop policy if exists "bookings_admin_all" on bookings;
create policy "bookings_admin_all" on bookings
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Admin RLS policies on cars
drop policy if exists "cars_admin_all" on cars;
create policy "cars_admin_all" on cars
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 5. Add business_name column to profiles if not exists
alter table profiles add column if not exists business_name text;
