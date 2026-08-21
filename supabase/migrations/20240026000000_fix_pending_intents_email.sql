-- Migration 26: Fix get_pending_payment_intents runtime type mismatch (42804)
-- auth.users.email is varchar(255); plpgsql RETURN QUERY checks types strictly,
-- so selecting u.email without a cast failed against the declared text column.
-- Same root cause was already handled in get_all_bookings via u.email::text.

revoke execute on function public.get_pending_payment_intents() from anon;

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
      u.email::text as renter_email
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
