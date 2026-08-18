-- Seed data for Pinol Rent

INSERT INTO departments (name, slug) VALUES
  ('Managua', 'managua'),
  ('Leon', 'leon'),
  ('Granada', 'granada'),
  ('Masaya', 'masaya'),
  ('Carazo', 'carazo'),
  ('Rivas', 'rivas'),
  ('Chinandega', 'chinandega'),
  ('Esteli', 'esteli'),
  ('Matagalpa', 'matagalpa'),
  ('Jinotega', 'jinotega'),
  ('Nueva Segovia', 'nueva-segovia'),
  ('Madriz', 'madriz'),
  ('Boaco', 'boaco'),
  ('Chontales', 'chontales'),
  ('Rio San Juan', 'rio-san-juan'),
  ('Costa Caribe Norte', 'racn'),
  ('Costa Caribe Sur', 'racs')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tags (name, slug) VALUES
  ('Aire Acondicionado', 'aire-acondicionado'),
  ('Transmision Automatica', 'transmision-automatica'),
  ('4x4', '4x4'),
  ('GPS', 'gps'),
  ('Seguro Incluido', 'seguro-incluido'),
  ('Entrega a Domicilio', 'entrega-domicilio'),
  ('Bluetooth', 'bluetooth'),
  ('Economico', 'economico'),
  ('Camara de Reversa', 'camara-reversa'),
  ('Asientos para Ninos', 'asientos-ninos')
ON CONFLICT (slug) DO NOTHING;
