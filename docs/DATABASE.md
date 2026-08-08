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
| unit_price | DECIMAL(10,2) | precio base por día (migración 20240024000000) |
| total_price | DECIMAL(10,2) | unit_price × 1.07 × días (redondeado) |
| renter_service_fee | DECIMAL(10,2) | total − (unit_price × días) |
| owner_commission | DECIMAL(10,2) | round(unit_price × 0.05) × días |
| owner_net_total | DECIMAL(10,2) | total − service fee − commission |
| status | booking_status | 'pending' \| 'pending_payment' \| 'confirmed' \| 'cancelled' \| 'completed' |
| payment_status | payment_status | 'pending' \| 'approved' \| 'rejected' (nullable) |
| payment_intent_id | TEXT | nullable, para link de revisión admin |
| card_last_four | TEXT | nullable |
| expires_at | TIMESTAMPTZ | nullable, expiración del pago pendiente |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | trigger |

> Nota: las columnas de comisión las calcula un trigger en INSERT (no las envía el cliente).
> El resto de la información de pago (payment_status, card_last_four, etc.) se
> actualiza desde la edge function `process-payment` vía `service_role`.

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

### notifications (migración 20240024000004)
| Columna | Tipo | Notas |
|---------|------|-------|
| id | BIGINT PK | auto |
| user_id | UUID FK | -> profiles CASCADE |
| title | TEXT | |
| body | TEXT | |
| type | TEXT | 'booking' \| 'chat' \| 'admin' |
| read | BOOLEAN | default false |
| data | JSONB | payload para deep links (ej. booking_id, payment_intent_id) |
| created_at | TIMESTAMPTZ | |

> `notifications` y `conversations` están en la publicación de realtime (`supabase_realtime`)
> para que la app actualice la lista en vivo.

## Funciones (RPCs)

| Función | Notas |
|---------|-------|
| `is_admin()` | SECURITY DEFINER; verifica rol 'admin' en profiles |
| `get_admin_secret_code()` | SECURITY DEFINER; lee GUC `app.settings.admin_secret_code` (fallback a `_settings`) |
| `approve_payment_intent(p_payment_intent_id)` | SECURITY DEFINER + guard `is_admin()`; confirma booking |
| `decline_payment_intent(p_payment_intent_id)` | SECURITY DEFINER + guard `is_admin()`; rechaza pago |
| `expire_stale_payment_intents(p_cutoff)` | SECURITY DEFINER + guard `is_admin()`; cancela pagos vencidos (batch) |
| `is_car_available(p_car_id, p_start_date, p_end_date)` | SECURITY DEFINER (volatile); valida lazy-expire + solapamiento |
| `get_booked_ranges(p_car_id)` | devuelve `{start_date, end_date}[]` de reservas activas |
| `get_all_bookings` | SECURITY DEFINER + guard `is_admin()` |
| `get_pending_payment_intents` | SECURITY DEFINER + guard `is_admin()` |
| `publish_car(...)`, `update_car(...)` | SECURITY DEFINER transaccionales; owner = auth.uid() |
| `mark_messages_read(p_conversation_id)` | SECURITY DEFINER; marca leídos como participante |
| `decrypt_payment_preview` | solo admin |
| `get_payment_deadline(p_booking_id)` | SECURITY DEFINER; devuelve `expires_at` del intent pendiente solo si la reserva es de `auth.uid()` |
| `set_payment_intent_expiry()` | trigger BEFORE INSERT en `payment_intents`; `expires_at = GREATEST(LEAST(start_date medianoche, now()+7 días), now()+30 min)` |

## RLS Policies

- **profiles**: SELECT all autenticados, INSERT/UPDATE own
- **cars**: SELECT all if available (owner sees own regardless), INSERT/UPDATE/DELETE own
- **bookings**: SELECT own (renter) or on own cars (owner), INSERT renter only, UPDATE/DELETE participantes
- **conversations**: SELECT/INSERT/UPDATE solo participantes (renter_id OR owner_id)
- **messages**: SELECT/INSERT solo participantes de la conversación, UPDATE own messages
- **reviews**: SELECT autenticados (los participantes pueden ver las de su reserva), INSERT/UPDATE/DELETE own
- **push_tokens**: INSERT/SELECT/DELETE own
- **notifications**: SELECT own
- **storage/car-images**: INSERT/UPDATE/DELETE own, SELECT all
- **storage/chat-attachments**: INSERT/UPDATE/DELETE own, SELECT authenticated (filtro por participante via RLS)

## Indexes

- bookings: car_id, renter_id, status
- conversations: renter_id, owner_id, car_id
- messages: (conversation_id, created_at)
- push_tokens: user_id
- notifications: user_id, read
