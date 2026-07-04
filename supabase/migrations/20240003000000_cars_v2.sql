-- Migration 3: Departments, Tags, Car Routes

-- 1. Departments
CREATE TABLE departments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_read_all" ON departments FOR SELECT USING (TRUE);

INSERT INTO departments (name, slug) VALUES
  ('Managua', 'managua'),
  ('León', 'leon'),
  ('Granada', 'granada'),
  ('Masaya', 'masaya'),
  ('Carazo', 'carazo'),
  ('Rivas', 'rivas'),
  ('Chinandega', 'chinandega'),
  ('Estelí', 'esteli'),
  ('Matagalpa', 'matagalpa'),
  ('Jinotega', 'jinotega'),
  ('Nueva Segovia', 'nueva-segovia'),
  ('Madriz', 'madriz'),
  ('Boaco', 'boaco'),
  ('Chontales', 'chontales'),
  ('Río San Juan', 'rio-san-juan'),
  ('Costa Caribe Norte', 'racn'),
  ('Costa Caribe Sur', 'racs');

-- 2. Tags
CREATE TABLE tags (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_read_all" ON tags FOR SELECT USING (TRUE);

INSERT INTO tags (name, slug) VALUES
  ('Aire Acondicionado', 'aire-acondicionado'),
  ('Transmisión Automática', 'transmision-automatica'),
  ('4x4', '4x4'),
  ('GPS', 'gps'),
  ('Seguro Incluido', 'seguro-incluido'),
  ('Entrega a Domicilio', 'entrega-domicilio'),
  ('Bluetooth', 'bluetooth'),
  ('Económico', 'economico'),
  ('Cámara de Reversa', 'camara-reversa'),
  ('Asientos para Niños', 'asientos-ninos');

-- 3. Car-Tags junction
CREATE TABLE car_tags (
  car_id BIGINT REFERENCES cars(id) ON DELETE CASCADE,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (car_id, tag_id)
);

ALTER TABLE car_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "car_tags_select" ON car_tags FOR SELECT USING (TRUE);
CREATE POLICY "car_tags_insert_own" ON car_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM cars WHERE cars.id = car_id AND cars.owner_id = auth.uid())
);
CREATE POLICY "car_tags_delete_own" ON car_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM cars WHERE cars.id = car_id AND cars.owner_id = auth.uid())
);

-- 4. Alter cars
ALTER TABLE cars ADD COLUMN department_id BIGINT REFERENCES departments(id);
ALTER TABLE cars ALTER COLUMN location DROP NOT NULL;

-- 5. Alter profiles + update handle_new_user trigger
ALTER TABLE profiles ADD COLUMN business_name TEXT;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'renter'::user_role),
    NEW.raw_user_meta_data ->> 'business_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cars_department_id ON cars(department_id);
CREATE INDEX IF NOT EXISTS idx_car_tags_car_id ON car_tags(car_id);
CREATE INDEX IF NOT EXISTS idx_car_tags_tag_id ON car_tags(tag_id);
