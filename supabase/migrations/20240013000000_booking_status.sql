-- Migration 13a: Add 'pending_payment' to booking_status enum
-- MUST be in its own migration: ALTER TYPE ... ADD VALUE cannot be
-- referenced within the same transaction.
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

alter type booking_status add value if not exists 'pending_payment';
