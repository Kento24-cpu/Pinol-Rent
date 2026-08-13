-- Migration 31: Cash payment flow (deposit to owner bank + WhatsApp proof)
-- 1. bookings.payment_method  ('card' | 'cash')
-- 2. bookings.cash_payment_deadline (anti-abuse: abandoned cash reservations
--    used to block the calendar forever because cash has no payment_intents
--    row to expire)
-- 3. profiles bank fields (owner's receiving account)
-- 4. cars.deposit_per_day -> deposit (fixed per-reservation deposit)
-- 5. Status transition trigger hardened: confirmations only by the car owner;
--    pending_payment -> confirmed only for cash bookings
-- 6. RPC confirm_cash_booking (owner confirms receipt of the bank deposit)
-- 7. expire_stale_cash_bookings + lazy expiry inside check_and_init_booking

-- 1. Payment method
alter table bookings add column if not exists payment_method text not null default 'card';
alter table bookings drop constraint if exists bookings_payment_method_check;
alter table bookings add constraint bookings_payment_method_check
  check (payment_method in ('card', 'cash'));

create index if not exists idx_bookings_payment_method on bookings(payment_method);

-- 2. Cash payment deadline (same rule as payment_intents.expires_at:
-- midnight before start_date, capped at 7 days, 30-minute floor)
alter table bookings add column if not exists cash_payment_deadline timestamptz;

create or replace function public.set_cash_payment_deadline()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_method = 'cash' and new.status = 'pending_payment' then
    new.cash_payment_deadline := greatest(
      least(new.start_date::timestamptz, now() + interval '7 days'),
      now() + interval '30 minutes'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists set_cash_payment_deadline_trigger on bookings;
create trigger set_cash_payment_deadline_trigger
  before insert or update of payment_method, status on bookings
  for each row execute function public.set_cash_payment_deadline();

create or replace function public.expire_stale_cash_bookings()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  update bookings
  set status = 'cancelled'
  where payment_method = 'cash'
    and status = 'pending_payment'
    and cash_payment_deadline is not null
    and cash_payment_deadline <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.expire_stale_cash_bookings() from anon;

-- 3. Owner bank account fields
alter table profiles add column if not exists bank_name text;
alter table profiles add column if not exists bank_account_number text;
alter table profiles add column if not exists bank_account_holder text;

-- 4. Deposit: per-day -> fixed per-reservation
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'deposit_per_day'
  ) then
    alter table cars rename column deposit_per_day to deposit;
  end if;
end;
$$;

-- 5. Hardened status transition trigger
-- Security: bookings RLS lets the renter update their own rows, so allowing
-- pending_payment -> confirmed unconditionally would let renters self-confirm
-- without paying. Confirmations require auth.uid() to be the car owner.
create or replace function public.check_booking_status_transition()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not (
      (old.status = 'pending_payment' and new.status in ('pending', 'cancelled')) or
      (old.status = 'pending_payment' and new.status = 'confirmed'
        and new.payment_method = 'cash'
        and exists (select 1 from cars c where c.id = new.car_id and c.owner_id = auth.uid())) or
      (old.status = 'pending' and new.status = 'confirmed'
        and exists (select 1 from cars c where c.id = new.car_id and c.owner_id = auth.uid())) or
      (old.status = 'pending' and new.status = 'cancelled') or
      (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Transición de estado inválida: % -> %', old.status, new.status
        using hint = 'invalid_status_transition';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_booking_status_transition_trigger on bookings;
create trigger check_booking_status_transition_trigger
  before update of status on bookings
  for each row execute function public.check_booking_status_transition();

-- 6. RPC: owner confirms receipt of the cash deposit (atomic, owner-only)
create or replace function public.confirm_cash_booking(p_booking_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner_id uuid := auth.uid();
  v_updated bigint;
begin
  if v_owner_id is null then
    raise exception 'No autorizado' using hint = 'login_required';
  end if;

  update bookings b
  set status = 'confirmed'
  where b.id = p_booking_id
    and b.payment_method = 'cash'
    and b.status = 'pending_payment'
    and exists (select 1 from cars c where c.id = b.car_id and c.owner_id = v_owner_id)
  returning b.id into v_updated;

  return v_updated is not null;
end;
$$;

revoke execute on function public.confirm_cash_booking(bigint) from anon;

-- 7. Lazy expiry for abandoned cash reservations (mirrors payment intents)
create or replace function public.check_and_init_booking()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_price decimal(10,2);
  v_days integer;
  v_total decimal(10,2);
begin
  if tg_op = 'INSERT' then
    if new.start_date < current_date then
      raise exception 'La fecha de inicio no puede ser en el pasado'
        using hint = 'past_start_date';
    end if;

    if new.end_date < new.start_date then
      raise exception 'La fecha de fin debe ser posterior a la fecha de inicio'
        using hint = 'invalid_date_range';
    end if;

    if (select count(*) from bookings
        where renter_id = new.renter_id
          and status = 'pending_payment') >= 3 then
      raise exception 'Tienes demasiadas reservas pendientes de pago. Completa o cancela las existentes.'
        using hint = 'too_many_pending';
    end if;

    -- Lazy-expire abandoned pending_payment intents before checking availability
    perform public.expire_stale_payment_intents();
    perform public.expire_stale_cash_bookings();

    if not public.is_car_available(new.car_id, new.start_date, new.end_date) then
      raise exception 'El auto no está disponible para las fechas seleccionadas'
        using hint = 'check_availability';
    end if;

    select price_per_day into v_price from cars where id = new.car_id;
    if v_price is null then
      raise exception 'Auto no encontrado'
        using hint = 'car_not_found';
    end if;

    v_days := new.end_date - new.start_date + 1;
    v_total := round(v_price * 1.07) * v_days;

    new.unit_price := v_price;
    new.total_price := v_total;
    new.renter_service_fee := v_total - (v_price * v_days);
    new.owner_commission := round(v_price * 0.05) * v_days;
    new.owner_net_total := v_total - new.renter_service_fee - new.owner_commission;
  end if;

  return new;
end;
$$;

drop trigger if exists check_and_init_booking_trigger on bookings;
create trigger check_and_init_booking_trigger
  before insert on bookings
  for each row execute function public.check_and_init_booking();

-- 8. Car RPCs: p_deposit_per_day -> p_deposit (column renamed to deposit)
-- DROP first: PostgreSQL cannot CREATE OR REPLACE a function whose input
-- parameter names changed (42P13).
drop function if exists public.publish_car(text, text, integer, text, numeric, numeric, text, text, bigint, boolean, text, bigint[]);
drop function if exists public.update_car(bigint, text, text, integer, text, numeric, numeric, text, text, bigint, boolean, text, bigint[]);

create or replace function public.publish_car(
  p_brand text,
  p_model text,
  p_year integer,
  p_color text,
  p_price_per_day numeric,
  p_deposit numeric,
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
    owner_id, brand, model, year, color, price_per_day, deposit,
    description, location, department_id, available, image_url
  )
  values (
    v_owner_id, p_brand, p_model, p_year, nullif(p_color, ''), p_price_per_day,
    p_deposit, nullif(p_description, ''), nullif(p_location, ''),
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
  p_deposit numeric,
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
    deposit = p_deposit,
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