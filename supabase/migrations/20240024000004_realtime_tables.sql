-- Migration 28: Enable Realtime for notifications and conversations
-- The app subscribes to postgres_changes on both tables (in-app notification
-- center, conversation list) but they were never added to the publication,
-- so realtime events never arrived.

alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table conversations;
