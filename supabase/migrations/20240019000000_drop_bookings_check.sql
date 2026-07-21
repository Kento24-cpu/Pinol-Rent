-- Migration 19: Remove obsolete CHECK constraint on bookings.status
-- The constraint `bookings_status_check` only allowed 4 values
-- (pending, confirmed, cancelled, completed) but the frontend
-- also uses pending_payment. Validation is handled by the
-- check_booking_status_transition trigger instead.

alter table bookings drop constraint if exists bookings_status_check;
