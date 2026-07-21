-- Migration 12a: Add 'admin' to user_role enum
-- MUST be in its own migration: ALTER TYPE ... ADD VALUE cannot reference
-- the new value within the same transaction.
alter type user_role add value if not exists 'admin';
