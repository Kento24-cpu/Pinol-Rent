-- Migration 11: Payment intents — encrypted card data for admin POS review

create table if not exists payment_intents (
  id bigint primary key generated always as identity,
  booking_id bigint references bookings(id) on delete cascade not null,
  card_encrypted text not null,
  card_last_four text not null,
  card_holder text not null,
  amount decimal(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'expired')),
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

alter table payment_intents enable row level security;

-- Only service_role via Edge Functions or RPC can touch this table
-- No RLS policies for public/anonymous/authenticated users

-- Index for admin queries
create index if not exists idx_payment_intents_status on payment_intents(status);
create index if not exists idx_payment_intents_booking on payment_intents(booking_id);

-- RPC: admin fetch pending payment intents (safe projection, no encrypted data)
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
language sql
security definer
set search_path = public, extensions
as $$
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
$$;

-- RPC: decrypt preview (last 4 only) for admin review
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

-- RPC: approve payment intent
create or replace function public.approve_payment_intent(
  p_payment_intent_id bigint,
  p_admin_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking_id bigint;
begin
  update payment_intents
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = p_admin_id
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

-- RPC: decline payment intent
create or replace function public.decline_payment_intent(
  p_payment_intent_id bigint,
  p_admin_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking_id bigint;
begin
  update payment_intents
  set status = 'declined',
      reviewed_at = now(),
      reviewed_by = p_admin_id
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

-- RPC: auto-expire stale payment intents (called by Edge Function cron or on-demand)
create or replace function public.expire_stale_payment_intents()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  with expired as (
    update payment_intents
    set status = 'expired'
    where status = 'pending'
      and expires_at <= now()
    returning booking_id
  )
  update bookings b
  set status = 'cancelled'
  from expired e
  where b.id = e.booking_id
    and b.status = 'pending_payment';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
