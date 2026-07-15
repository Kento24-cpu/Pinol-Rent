-- Migration 7: Booking system — availability, exclusion constraint, triggers

-- 1. Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- 2. Add unit_price column (snapshot of car's price_per_day at booking time)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);

-- 3. Exclusion constraint: prevent overlapping date ranges for same car
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    car_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status != 'cancelled');

-- 4. Function: check if car is available for a date range
CREATE OR REPLACE FUNCTION public.is_car_available(
  p_car_id BIGINT,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
SET search_path = public, extensions
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
      AND status != 'cancelled'
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  );
END;
$$;

-- 5. Trigger: validate availability and snapshot price on insert
CREATE OR REPLACE FUNCTION public.check_and_init_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_price DECIMAL(10,2);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_car_available(NEW.car_id, NEW.start_date, NEW.end_date) THEN
      RAISE EXCEPTION 'El auto no está disponible para las fechas seleccionadas'
        USING HINT = 'check_availability';
    END IF;

    SELECT price_per_day INTO v_price FROM cars WHERE id = NEW.car_id;
    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Auto no encontrado'
        USING HINT = 'car_not_found';
    END IF;

    NEW.unit_price := v_price;
    NEW.total_price := v_price * (NEW.end_date - NEW.start_date + 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_and_init_booking_trigger ON bookings;
CREATE TRIGGER check_and_init_booking_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_and_init_booking();

-- 6. Trigger: update car.available based on active confirmed bookings
CREATE OR REPLACE FUNCTION public.sync_car_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE cars SET available = (
    SELECT NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE car_id = COALESCE(NEW.car_id, OLD.car_id)
        AND status = 'confirmed'
        AND CURRENT_DATE BETWEEN start_date AND end_date
    )
  ) WHERE id = COALESCE(NEW.car_id, OLD.car_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_car_availability_trigger ON bookings;
CREATE TRIGGER sync_car_availability_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_car_availability();

-- 7. Valid status transitions function
CREATE OR REPLACE FUNCTION public.check_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled')) OR
      (OLD.status = 'confirmed' AND NEW.status IN ('completed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Transición de estado inválida: % -> %', OLD.status, NEW.status
        USING HINT = 'invalid_status_transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_booking_status_transition_trigger ON bookings;
CREATE TRIGGER check_booking_status_transition_trigger
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_status_transition();

-- 8. Enable Realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- 9. Index for availability queries
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(car_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(car_id, status) WHERE status != 'cancelled';

-- 10. Trigger: notify via Edge Function on booking INSERT or status UPDATE
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  supabase_url text;
  service_key text;
  payload jsonb;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'bookings',
      'schema', 'public',
      'record', row_to_json(NEW)::jsonb,
      'old_record', null::jsonb
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'bookings',
      'schema', 'public',
      'record', row_to_json(NEW)::jsonb,
      'old_record', jsonb_build_object('status', OLD.status)
    );
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-booking',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    timeout_milliseconds := 2000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_booking_trigger ON bookings;
CREATE TRIGGER notify_booking_trigger
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();
