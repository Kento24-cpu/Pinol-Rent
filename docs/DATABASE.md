# Database Schema

## Tablas

### profiles
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | references auth.users |
| full_name | TEXT NOT NULL | |
| phone | TEXT | |
| role | user_role | 'owner' \| 'renter' |
| business_name | TEXT | solo owners |
| avatar_url | TEXT | migration 5 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | trigger |

### cars
| Columna | Tipo | Notas |
|---------|------|-------|
| id | BIGINT PK | auto |
| owner_id | UUID FK | -> profiles CASCADE |
| brand | TEXT NOT NULL | |
| model | TEXT NOT NULL | |
| year | INT | |
| color | TEXT | |
| price_per_day | DECIMAL(10,2) | |
| location | TEXT | nullable |
| description | TEXT | |
| image_url | TEXT | |
| available | BOOLEAN | default true |
| department_id | BIGINT FK | -> departments |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | trigger |

### departments
| Columna | Tipo |
|---------|------|
| id | BIGINT PK |
| name | TEXT UNIQUE |
| slug | TEXT UNIQUE |

### tags
| Columna | Tipo |
|---------|------|
| id | BIGINT PK |
| name | TEXT UNIQUE |
| slug | TEXT UNIQUE |

### car_tags (M:N)
| Columna | Tipo |
|---------|------|
| car_id | BIGINT FK -> cars CASCADE |
| tag_id | BIGINT FK -> tags CASCADE |
| PK | (car_id, tag_id) |

### bookings
| Columna | Tipo | Notas |
|---------|------|-------|
| id | BIGINT PK | auto |
| car_id | BIGINT FK | -> cars CASCADE |
| renter_id | UUID FK | -> profiles CASCADE |
| start_date | DATE | |
| end_date | DATE | |
| total_price | DECIMAL(10,2) | |
| status | booking_status | 'pending' \| 'confirmed' \| 'cancelled' \| 'completed' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | trigger |

### conversations (migration 6)
| Columna | Tipo | Notas |
|---------|------|-------|
| id | BIGINT PK | auto |
| car_id | BIGINT FK | -> cars CASCADE |
| renter_id | UUID FK | -> profiles CASCADE |
| owner_id | UUID FK | -> profiles CASCADE |
| booking_id | BIGINT FK | -> bookings SET NULL (opcional) |
| last_message_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### messages (migration 6)
| Columna | Tipo | Notas |
|---------|------|-------|
| id | BIGINT PK | auto |
| conversation_id | BIGINT FK | -> conversations CASCADE |
| sender_id | UUID FK | -> profiles CASCADE |
| content | TEXT NOT NULL | |
| attachment_url | TEXT | opcional |
| read_at | TIMESTAMPTZ | leído |
| created_at | TIMESTAMPTZ | |

### push_tokens (migration 6)
| Columna | Tipo |
|---------|------|
| id | BIGINT PK |
| user_id | UUID FK -> profiles CASCADE |
| token | TEXT NOT NULL |
| platform | TEXT DEFAULT 'expo' |
| created_at | TIMESTAMPTZ |

## RLS Policies

- **profiles**: SELECT all autenticados, INSERT/UPDATE own
- **cars**: SELECT all if available (owner sees own regardless), INSERT/UPDATE/DELETE own
- **bookings**: SELECT own (renter) or on own cars (owner), INSERT renter only, UPDATE/DELETE participants
- **conversations**: SELECT/INSERT/UPDATE solo participantes (renter_id OR owner_id)
- **messages**: SELECT/INSERT solo participantes de la conversación, UPDATE own messages
- **push_tokens**: INSERT/SELECT/DELETE own
- **storage/car-images**: INSERT/UPDATE/DELETE own, SELECT all
- **storage/chat-attachments**: INSERT/UPDATE/DELETE own, SELECT authenticated (filtro por participante via RLS)

## Indexes

- bookings: car_id, renter_id, status
- conversations: renter_id, owner_id, car_id
- messages: (conversation_id, created_at)
- push_tokens: user_id
