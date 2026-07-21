-- Migration 14: Profile fields — cedula, business_address, trigger final

-- 1. New columns
alter table profiles add column if not exists cedula text;
alter table profiles add column if not exists business_address text;
alter table profiles add column if not exists phone text;

-- 2. Make full_name nullable (owner no tiene nombre personal)
alter table profiles alter column full_name drop not null;

-- 3. Unique constraint on cedula
do $$ begin
  alter table profiles add constraint profiles_cedula_unique unique (cedula);
exception when duplicate_table then null;
end $$;

-- 4. Recreate handle_new_user — blindado, admin early return
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

  begin
    v_secret_code := (select value from _settings where key = 'admin_secret_code');
  exception when others then
    v_secret_code := null;
  end;

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
