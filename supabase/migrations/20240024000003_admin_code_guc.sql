-- Migration 27: admin_secret_code via GUC
-- The hardcoded default 'pr-admin2026' (migration 15) let anyone with repo
-- access register as admin. It is removed here; production must set
-- app.settings.admin_secret_code (ALTER DATABASE ... SET ...) or keep a
-- rotated value in _settings.

delete from _settings where key = 'admin_secret_code' and value = 'pr-admin2026';

-- Helper: GUC first, _settings as fallback (readable even if _settings is empty)
create or replace function public.get_admin_secret_code()
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_code text;
begin
  begin
    v_code := current_setting('app.settings.admin_secret_code', true);
  exception when others then
    v_code := null;
  end;

  if v_code is null then
    begin
      v_code := (select value from _settings where key = 'admin_secret_code');
    exception when others then
      v_code := null;
    end;
  end if;

  return v_code;
end;
$$;

-- Recreate handle_new_user using the helper
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_admin_code text;
  v_secret_code text;
  v_meta jsonb;
begin
  v_meta := new.raw_user_meta_data;
  v_admin_code := v_meta ->> 'admin_code';
  v_secret_code := public.get_admin_secret_code();

  -- Admin: early return, datos mínimos
  if v_admin_code is not null and v_secret_code is not null and v_admin_code = v_secret_code then
    insert into profiles (id, full_name, business_name, business_address, phone, cedula, role)
    values (new.id, 'Administrador', null, null, null, null, 'admin'::user_role);
    return new;
  end if;

  -- Owner vs Renter
  if v_meta ->> 'role' = 'owner' then
    insert into profiles (id, full_name, business_name, business_address, phone, cedula, role)
    values (
      new.id,
      null,
      v_meta ->> 'business_name',
      v_meta ->> 'business_address',
      v_meta ->> 'phone',
      v_meta ->> 'cedula',
      'owner'::user_role
    );
  else
    insert into profiles (id, full_name, business_name, business_address, phone, cedula, role)
    values (
      new.id,
      v_meta ->> 'full_name',
      null,
      null,
      v_meta ->> 'phone',
      v_meta ->> 'cedula',
      'renter'::user_role
    );
  end if;

  return new;
end;
$$ language plpgsql;
