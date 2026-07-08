-- Migration 5: Profile avatars

ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
