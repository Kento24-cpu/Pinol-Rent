-- Migration 26: Lazy expiration + booked ranges for the date picker
-- is_car_available ran with RLS enabled, so it always returned true for cars
-- the caller doesn't own. It now runs as SECURITY DEFINER and lazily expires
-- abandoned pending_payment intents (removing the stale booking rows that
-- blocked availability forever).

-- is_car_available: security definer + lazy-expire (note: it becomes volatile
-- because it performs maintenance updates, so it cannot be declared STABLE)
create or replace function public.is_car_available(
  p_car_id bigint,
  p_start_date date,
  p_end_date date,
  p_exclude_booking_id bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.expire_stale_payment_intents();

  return not exists (
    select 1 from bookings
    where car_id = p_car_id
      and status != 'cancelled'
      and (p_exclude_booking_id is null or id != p_exclude_booking_id)
      and daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  );
end;
$$;

-- RPC: booked ranges for a car, used to disable occupied dates in the picker
create or replace function public.get_booked_ranges(p_car_id bigint)
returns table (
  start_date date,
  end_date date
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.expire_stale_payment_intents();

  return query
    select b.start_date, b.end_date
    from bookings b
    where b.car_id = p_car_id
      and b.status != 'cancelled'
    order by b.start_date;
end;
$$;
