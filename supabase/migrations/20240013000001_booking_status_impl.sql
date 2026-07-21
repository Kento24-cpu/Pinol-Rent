-- Migration 13b: pending_payment status implementation
-- Runs after 20240013000000 committed 'pending_payment' to booking_status.

-- 1. Recreate status transition trigger to include pending_payment
create or replace function public.check_booking_status_transition()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not (
      (old.status = 'pending_payment' and new.status in ('pending', 'cancelled')) or
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) or
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

-- 2. Recreate check_and_init_booking to maintain compatibility
drop trigger if exists check_and_init_booking_trigger on bookings;
drop function if exists public.check_and_init_booking();

create or replace function public.check_and_init_booking()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_price decimal(10,2);
begin
  if tg_op = 'INSERT' then
    if not public.is_car_available(new.car_id, new.start_date, new.end_date) then
      raise exception 'El auto no está disponible para las fechas seleccionadas'
        using hint = 'check_availability';
    end if;

    select price_per_day into v_price from cars where id = new.car_id;
    if v_price is null then
      raise exception 'Auto no encontrado'
        using hint = 'car_not_found';
    end if;

    new.unit_price := v_price;
    new.total_price := v_price * (new.end_date - new.start_date + 1);
  end if;

  return new;
end;
$$;

create trigger check_and_init_booking_trigger
  before insert on bookings
  for each row execute function public.check_and_init_booking();

-- 3. Update notify_booking_change to handle pending_payment
create or replace function public.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  supabase_url text;
  service_key text;
  payload jsonb;
begin
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  if supabase_url is null or service_key is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'bookings',
      'schema', 'public',
      'record', row_to_json(new)::jsonb,
      'old_record', null::jsonb
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'bookings',
      'schema', 'public',
      'record', row_to_json(new)::jsonb,
      'old_record', jsonb_build_object('status', old.status)
    );
  else
    return new;
  end if;

  perform net.http_post(
    url := supabase_url || '/functions/v1/notify-booking',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    timeout_milliseconds := 2000
  );
  return new;
end;
$$;
