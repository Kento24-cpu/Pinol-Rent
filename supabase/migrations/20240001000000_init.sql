-- Roles enum
CREATE TYPE user_role AS ENUM ('owner', 'renter');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'renter',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cars
CREATE TABLE cars (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  price_per_day DECIMAL(10,2) NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  car_id BIGINT REFERENCES cars(id) NOT NULL,
  renter_id UUID REFERENCES profiles(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, insert own, update own
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cars: anyone can read available, owners manage own
CREATE POLICY "cars_read_all" ON cars FOR SELECT USING (TRUE);
CREATE POLICY "cars_insert_own" ON cars FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "cars_update_own" ON cars FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "cars_delete_own" ON cars FOR DELETE USING (auth.uid() = owner_id);

-- Bookings: renters see own, owners see bookings on their cars
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  auth.uid() = renter_id OR
  EXISTS (SELECT 1 FROM cars WHERE cars.id = bookings.car_id AND cars.owner_id = auth.uid())
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = renter_id);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
  auth.uid() = renter_id OR
  EXISTS (SELECT 1 FROM cars WHERE cars.id = bookings.car_id AND cars.owner_id = auth.uid())
);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE USING (
  auth.uid() = renter_id OR
  EXISTS (SELECT 1 FROM cars WHERE cars.id = bookings.car_id AND cars.owner_id = auth.uid())
);
