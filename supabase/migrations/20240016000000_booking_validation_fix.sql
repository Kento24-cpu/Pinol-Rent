-- Migration 16: Booking validation, availability fix, payment intent dedup
-- Addresses: booking date validation, sync_car_availability gaps,
-- payment_intents unique constraint, reviews cleanup, messages RLS

-- 1. Fix check_and_init_booking: validate dates before price computation
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
    if new.start_date < current_date then
      raise exception 'La fecha de inicio no puede ser en el pasado'
        using hint = 'past_start_date';
    end if;

    if new.end_date < new.start_date then
      raise exception 'La fecha de fin debe ser posterior a la fecha de inicio'
        using hint = 'invalid_date_range';
    end if;

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

-- 2. Fix sync_car_availability: include pending/pending_payment bookings
create or replace function public.sync_car_availability()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update cars set available = (
    select not exists (
      select 1 from bookings
      where car_id = coalesce(new.car_id, old.car_id)
        and status in ('confirmed', 'pending', 'pending_payment')
        and current_date between start_date and end_date
    )
  ) where id = coalesce(new.car_id, old.car_id);
  return new;
end;
$$;

-- 3. Add UNIQUE constraint on payment_intents.booking_id
-- Prevents duplicate payment intents for the same booking
do $$ begin
  alter table payment_intents add constraint payment_intents_booking_id_unique unique (booking_id);
exception when duplicate_table then null;
end $$;

-- 4. Auto-update reviews.updated_at on row change
create or replace function public.update_reviews_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_reviews_timestamp_trigger on reviews;
create trigger update_reviews_timestamp_trigger
  before update on reviews
  for each row
  execute function public.update_reviews_timestamp();

-- 5. Fix reviews_delete_own: only allow delete if booking is still completed
drop policy if exists "reviews_delete_own" on reviews;
create policy "reviews_delete_own" on reviews
  for delete using (
    auth.uid() = renter_id
    and exists (
      select 1 from bookings
      where bookings.id = reviews.booking_id
        and bookings.status = 'completed'
    )
  );

-- 6. Fix messages RLS: WITH CHECK prevents sender from changing sender_id
drop policy if exists "messages_update_own" on messages;
create policy "messages_update_own" on messages
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
