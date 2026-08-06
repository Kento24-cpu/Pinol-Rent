-- Migration 24: Server-side commission model
-- The client was sending total_price including the 7% renter fee, but the
-- trigger overwrote it with base × days, so the charged amount differed from
-- the quoted one. The trigger is now the single source of truth for pricing:
--   unit_price         = base price per day (snapshot)
--   total_price        = round(base × 1.07) × days   (what the renter pays)
--   renter_service_fee = total_price - base × days   (7% fee, materialized)
--   owner_commission   = round(base × 0.05) × days   (platform share)
--   owner_net_total    = total - fee - commission    (what the owner receives)

alter table bookings
  add column if not exists renter_service_fee decimal(10,2) not null default 0,
  add column if not exists owner_commission decimal(10,2) not null default 0,
  add column if not exists owner_net_total decimal(10,2) not null default 0;

-- Backfill existing bookings created before this migration
-- (they were stored without the fee: total = base × days)
update bookings b set
  renter_service_fee = 0,
  owner_commission = coalesce(round(b.unit_price * 0.05) * (b.end_date - b.start_date + 1), 0),
  owner_net_total = b.total_price - coalesce(round(b.unit_price * 0.05) * (b.end_date - b.start_date + 1), 0)
where b.unit_price is not null
  and b.total_price > 0
  and b.status in ('pending', 'confirmed', 'completed');

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
