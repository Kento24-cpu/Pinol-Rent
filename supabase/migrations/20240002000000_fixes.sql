-- Migration 2: Fixes — CASCADE, updated_at, trigger, RLS

-- 1. Booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

ALTER TABLE bookings
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE booking_status USING status::booking_status,
  ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Drop old FK constraints, recreate with ON DELETE CASCADE
ALTER TABLE profiles
  DROP CONSTRAINT profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE cars
  DROP CONSTRAINT cars_owner_id_fkey,
  ADD CONSTRAINT cars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE bookings
  DROP CONSTRAINT bookings_car_id_fkey,
  ADD CONSTRAINT bookings_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE bookings
  DROP CONSTRAINT bookings_renter_id_fkey,
  ADD CONSTRAINT bookings_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Add updated_at columns
ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE cars ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cars_updated_at BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'renter'::user_role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Fix RLS policies
DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Only show available cars to unauthenticated users
DROP POLICY IF EXISTS "cars_read_all" ON cars;
CREATE POLICY "cars_read_all" ON cars
  FOR SELECT USING (available = true OR auth.uid() = owner_id);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cars_owner_id ON cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_cars_available ON cars(available);
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
