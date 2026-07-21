-- Migration 21: Admin bookings list RPC

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
language sql
security definer
set search_path = public, extensions
as $$
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
$$;
