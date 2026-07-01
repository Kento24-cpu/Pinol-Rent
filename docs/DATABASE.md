# Esquema de base de datos

## Tecnología

PostgreSQL 15+ en Supabase. Migraciones en `/supabase/migrations/`.

## Tablas

### `profiles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID (PK) | Referencia a `auth.users` |
| full_name | TEXT | Nombre completo |
| phone | TEXT | Teléfono de contacto |
| role | ENUM('owner', 'renter') | Rol del usuario |
| created_at | TIMESTAMPTZ | Fecha de registro |

### `cars`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | BIGINT (PK) | ID autoincremental |
| owner_id | UUID (FK → profiles) | Propietario del auto |
| brand | TEXT | Marca (Toyota, Nissan, etc.) |
| model | TEXT | Modelo específico |
| year | INTEGER | Año del vehículo |
| color | TEXT | Color |
| price_per_day | DECIMAL(10,2) | Precio por día en USD/C$ |
| location | TEXT | Ciudad o dirección |
| description | TEXT | Descripción del auto |
| image_url | TEXT | URL de foto (Supabase Storage) |
| available | BOOLEAN | Disponible para rentar |
| created_at | TIMESTAMPTZ | Fecha de publicación |

### `bookings`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | BIGINT (PK) | ID autoincremental |
| car_id | BIGINT (FK → cars) | Auto reservado |
| renter_id | UUID (FK → profiles) | Persona que reserva |
| start_date | DATE | Inicio de la renta |
| end_date | DATE | Fin de la renta |
| total_price | DECIMAL(10,2) | Precio total calculado |
| status | ENUM('pending', 'confirmed', 'cancelled', 'completed') | Estado |
| created_at | TIMESTAMPTZ | Fecha de reserva |

## Políticas de seguridad (RLS)

| Tabla | Operación | ¿Quién puede? |
|-------|-----------|---------------|
| profiles | SELECT | Todos (público) |
| profiles | UPDATE | Solo propio perfil |
| cars | SELECT | Todos (público) |
| cars | INSERT | Solo owner del auto |
| cars | UPDATE | Solo owner del auto |
| cars | DELETE | Solo owner del auto |
| bookings | SELECT | El renter o el owner del auto |
| bookings | INSERT | Solo el renter |
| bookings | UPDATE | El renter o el owner del auto |
