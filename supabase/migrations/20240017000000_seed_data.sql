-- Migration 17: Seed cars for development
-- Profiles se crean desde el login.

-- 1. Auth users (password: password123)
insert into auth.users (id, instance_id, email, encrypted_password, confirmed_at, aud, role, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'carlos@test.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), 'authenticated', 'authenticated',
   '{"role":"owner","full_name":"Carlos López","business_name":"Auto Rentas CR"}',
   now(), now()),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'maria@test.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), 'authenticated', 'authenticated',
   '{"role":"owner","full_name":"María García","business_name":"García Autos"}',
   now(), now()),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'juan@test.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), 'authenticated', 'authenticated',
   '{"role":"renter","full_name":"Juan Pérez"}',
   now(), now())
on conflict (id) do nothing;

-- 2. Profiles directo (el trigger handle_new_user los crea, pero por si acaso no existe)
insert into public.profiles (id, full_name, business_name, role)
values
  ('a0000000-0000-0000-0000-000000000001', 'Carlos López', 'Auto Rentas CR', 'owner'),
  ('a0000000-0000-0000-0000-000000000002', 'María García', 'García Autos', 'owner'),
  ('a0000000-0000-0000-0000-000000000003', 'Juan Pérez', null, 'renter')
on conflict (id) do nothing;

-- 3. Cars
insert into public.cars (owner_id, brand, model, year, price_per_day, location, department_id, available, description)
values
  ('a0000000-0000-0000-0000-000000000001', 'Toyota',  'Corolla', 2022, 45, 'Managua', 1, true, 'Sedán 4 puertas, aire acondicionado'),
  ('a0000000-0000-0000-0000-000000000001', 'Nissan',  'Versa',   2021, 35, 'Managua', 1, true, 'Económico, ideal para la ciudad'),
  ('a0000000-0000-0000-0000-000000000002', 'Hyundai', 'Tucson',  2023, 65, 'León',    2, true, 'SUV full equipo, transmisión automática'),
  ('a0000000-0000-0000-0000-000000000002', 'Suzuki',  'Swift',   2022, 40, 'Granada', 3, true, 'Compacto, perfecto para turismo'),
  ('a0000000-0000-0000-0000-000000000001', 'Ford',    'Ranger',  2023, 80, 'Estelí',  8, true, 'Pickup 4x4, doble cabina, diésel'),
  ('a0000000-0000-0000-0000-000000000002', 'Kia',     'Rio',     2021, 30, 'Masaya',  4, true, 'Auto económico, bajo consumo')
on conflict (id) do nothing;
