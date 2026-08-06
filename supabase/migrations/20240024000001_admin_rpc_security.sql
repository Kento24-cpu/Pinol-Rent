-- Migration 25: Admin RPC security
-- Every SECURITY DEFINER admin RPC now validates is_admin() before executing.
-- Without this any authenticated user could list payment intents (card data,
-- emails, amounts) and approve/decline payments. Anonymous no longer has EXECUTE.

revoke execute on function public.get_pending_payment_intents() from anon;
revoke execute on function public.decrypt_payment_preview(bigint) from anon;
revoke execute on function public.approve_payment_intent(bigint, uuid) from anon;
revoke execute on function public.decline_payment_intent(bigint, uuid) from anon;
revoke execute on function public.get_all_bookings() from anon;

-- get_pending_payment_intents: convert to plpgsql to add the guard
create or replace function public.get_pending_payment_intents()
returns table (
  id bigint,
  booking_id bigint,
  card_last_four text,
  card_holder text,
  amount decimal(10,2),
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  brand text,
  model text,
  renter_name text,
  renter_email text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado' using hint = 'admin_only';
  end if;

  perform public.expire_stale_payment_intents();

  return query
    select
      pi.id,
      pi.booking_id,
      pi.card_last_four,
      pi.card_holder,
      pi.amount,
      pi.status,
      pi.expires_at,
      pi.created_at,
      c.brand,
      c.model,
      p.full_name as renter_name,
      u.email as renter_email
    from payment_intents pi
    join bookings b on b.id = pi.booking_id
    join cars c on c.id = b.car_id
    join profiles p on p.id = b.renter_id
    join auth.users u on u.id = b.renter_id
    where pi.status = 'pending'
      and pi.expires_at > now()
    order by pi.created_at desc;
end;
$$;

-- decrypt_payment_preview: add guard
create or replace function public.decrypt_payment_preview(
  p_payment_intent_id bigint
)
returns table (
  card_last_four text,
  card_holder text,
  amount decimal(10,2),
  booking_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado' using hint = 'admin_only';
  end if;

  return query
  select
    pi.card_last_four,
    pi.card_holder,
    pi.amount,
    b.status::text,
    pi.created_at
  from payment_intents pi
  join bookings b on b.id = pi.booking_id
  where pi.id = p_payment_intent_id
    and pi.status = 'pending'
    and pi.expires_at > now();
end;
$$;

-- approve_payment_intent: add guard + derive admin from auth.uid()
create or replace function public.approve_payment_intent(
  p_payment_intent_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking_id bigint;
  v_admin_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado' using hint = 'admin_only';
  end if;

  v_admin_id := auth.uid();

  update payment_intents
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin_id
  where id = p_payment_intent_id
    and status = 'pending'
    and expires_at > now()
  returning booking_id into v_booking_id;

  if v_booking_id is null then
    return false;
  end if;

  update bookings
  set status = 'pending'
  where id = v_booking_id
    and status = 'pending_payment';

  return found;
end;
$$;

-- decline_payment_intent: add guard + derive admin from auth.uid()
create or replace function public.decline_payment_intent(
  p_payment_intent_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking_id bigint;
  v_admin_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado' using hint = 'admin_only';
  end if;

  v_admin_id := auth.uid();

  update payment_intents
  set status = 'declined',
      reviewed_at = now(),
      reviewed_by = v_admin_id
  where id = p_payment_intent_id
    and status = 'pending'
    and expires_at > now()
  returning booking_id into v_booking_id;

  if v_booking_id is null then
    return false;
  end if;

  update bookings
  set status = 'cancelled'
  where id = v_booking_id
    and status = 'pending_payment';

  return found;
end;
$$;

-- get_all_bookings: convert to plpgsql to add the guard
create or replace function public.get_all_bookings()
returns table (
  id bigint,
  start_date date,
  end_date date,
  status text,
  total_price decimal(10,2),
  created_at timestamptz,
  car_brand text,
  car_model text,
  car_id bigint,
  renter_id uuid,
  renter_name text,
  renter_email text,
  renter_phone text,
  payment_intent_id bigint,
  payment_status text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado' using hint = 'admin_only';
  end if;

  return query
  select
    b.id,
    b.start_date,
    b.end_date,
    b.status,
    b.total_price,
    b.created_at,
    c.brand,
    c.model,
    b.car_id,
    b.renter_id,
    p.full_name,
    u.email::text,
    p.phone,
    pi.id,
    pi.status
  from bookings b
  join cars c on c.id = b.car_id
  join profiles p on p.id = b.renter_id
  join auth.users u on u.id = b.renter_id
  left join payment_intents pi on pi.booking_id = b.id
  order by b.created_at desc;
end;
$$;
