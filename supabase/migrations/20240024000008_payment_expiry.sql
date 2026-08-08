-- Migration 30: Payment deadline = day of the reservation (max 7 days)
-- expires_at was hardcoded to now() + 30 minutes (table default). Now the
-- renter can complete the payment until midnight of the rental start date,
-- capped at 7 days from creation (anti-abuse: pending_payment blocks the car
-- in the availability calendar). Same-day bookings keep a 30-minute floor.
--
-- Note: date::timestamptz uses the session timezone (UTC on Supabase), so
-- "midnight of the start date" = 20:00 AST the day before. Acceptable.

create or replace function public.set_payment_intent_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_start_date date;
  v_created timestamptz := now();
begin
  select b.start_date into v_start_date
  from bookings b
  where b.id = new.booking_id;

  if v_start_date is not null then
    new.expires_at := greatest(
      least(v_start_date::timestamptz, v_created + interval '7 days'),
      v_created + interval '30 minutes'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists set_payment_intent_expiry_trigger on payment_intents;
create trigger set_payment_intent_expiry_trigger
  before insert on payment_intents
  for each row execute function public.set_payment_intent_expiry();

-- RPC: payment deadline for the renter's own pending payment.
-- payment_intents has no read policies, so this is SECURITY DEFINER and
-- verifies the booking belongs to auth.uid().
create or replace function public.get_payment_deadline(p_booking_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_deadline timestamptz;
begin
  select pi.expires_at into v_deadline
  from payment_intents pi
  join bookings b on b.id = pi.booking_id
  where pi.booking_id = p_booking_id
    and pi.status = 'pending'
    and b.renter_id = auth.uid();

  return v_deadline;
end;
$$;

revoke execute on function public.get_payment_deadline(bigint) from anon;
