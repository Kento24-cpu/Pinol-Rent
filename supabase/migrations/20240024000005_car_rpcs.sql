-- Migration 29: Transactional car RPCs
-- publish.tsx / edit/[id].tsx inserted the car and its tags in two separate
-- queries: a tag failure left the car published and a retry created a
-- duplicate. These RPCs wrap both writes in a single transaction and derive
-- the owner from auth.uid() (no client-controlled owner_id).

create or replace function public.publish_car(
  p_brand text,
  p_model text,
  p_year integer,
  p_color text,
  p_price_per_day numeric,
  p_deposit_per_day numeric,
  p_description text,
  p_location text,
  p_department_id bigint,
  p_available boolean,
  p_image_url text,
  p_tag_ids bigint[]
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_car_id bigint;
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then
    raise exception 'No autorizado' using hint = 'login_required';
  end if;

  insert into cars (
    owner_id, brand, model, year, color, price_per_day, deposit_per_day,
    description, location, department_id, available, image_url
  )
  values (
    v_owner_id, p_brand, p_model, p_year, nullif(p_color, ''), p_price_per_day,
    p_deposit_per_day, nullif(p_description, ''), nullif(p_location, ''),
    p_department_id, p_available, p_image_url
  )
  returning id into v_car_id;

  if p_tag_ids is not null and array_length(p_tag_ids, 1) > 0 then
    insert into car_tags (car_id, tag_id)
    select v_car_id, t from unnest(p_tag_ids) as t;
  end if;

  return v_car_id;
end;
$$;

create or replace function public.update_car(
  p_car_id bigint,
  p_brand text,
  p_model text,
  p_year integer,
  p_color text,
  p_price_per_day numeric,
  p_deposit_per_day numeric,
  p_description text,
  p_location text,
  p_department_id bigint,
  p_available boolean,
  p_image_url text,
  p_tag_ids bigint[]
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if not exists (select 1 from cars where id = p_car_id and owner_id = v_owner_id) then
    raise exception 'Auto no encontrado o no autorizado' using hint = 'not_owner';
  end if;

  update cars set
    brand = p_brand,
    model = p_model,
    year = p_year,
    color = nullif(p_color, ''),
    price_per_day = p_price_per_day,
    deposit_per_day = p_deposit_per_day,
    description = nullif(p_description, ''),
    location = nullif(p_location, ''),
    department_id = p_department_id,
    available = p_available,
    image_url = p_image_url
  where id = p_car_id;

  delete from car_tags where car_id = p_car_id;
  if p_tag_ids is not null and array_length(p_tag_ids, 1) > 0 then
    insert into car_tags (car_id, tag_id)
    select p_car_id, t from unnest(p_tag_ids) as t;
  end if;

  return true;
end;
$$;
