-- Migration 6: Chat system (conversations + messages)
-- Revised: idempotent, pg_net enabled, safe to re-run

-- 1. Enable pg_net for HTTP requests to Edge Function
create extension if not exists pg_net with schema extensions;

-- 2. Drop existing objects (safe to re-run)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP FUNCTION IF EXISTS public.notify_chat_on_message;

-- 3. Conversations
CREATE TABLE conversations (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  car_id          BIGINT REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  renter_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id      BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_renter ON conversations(renter_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_car ON conversations(car_id);

-- Prevent duplicate conversations (race condition guard)
do $$ begin
  alter table conversations add constraint conversations_unique_participants unique (car_id, renter_id, owner_id);
exception when duplicate_table then null;
end $$;

-- 4. Messages
CREATE TABLE messages (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  attachment_url  TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- 5. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "conversations_select_participant" ON conversations
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "conversations_update_last_message" ON conversations
  FOR UPDATE USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Messages RLS
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- 6. Storage bucket for chat attachments
-- Note: storage schema/bootstrap is handled by migration 4 (images.sql)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-attachments', 'chat-attachments', false, 5242880, '{"image/png","image/jpeg","image/webp","image/heic","image/heif","application/pdf"}')
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_attachments_select_participant" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete_own" ON storage.objects;

CREATE POLICY "chat_attachments_select_participant" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "chat_attachments_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat_attachments_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'chat-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat_attachments_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 8. Trigger function: calls Edge Function via pg_net on message insert
-- Reads service key from Supabase custom config parameters.
-- Set these before applying via:
--   ALTER DATABASE postgres SET "app.settings.supabase_url" TO 'https://<project>.supabase.co';
--   ALTER DATABASE postgres SET "app.settings.service_role_key" TO '<service-role-jwt>';
create or replace function public.notify_chat_on_message()
returns trigger
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  supabase_url text;
  service_key text;
begin
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  if supabase_url is null or service_key is null then
    raise warning 'app.settings.supabase_url or app.settings.service_role_key not set — skipping push';
    return new;
  end if;

  perform net.http_post(
    url := supabase_url || '/functions/v1/notify-chat',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'schema', 'public',
      'record', row_to_json(new)::jsonb,
      'old_record', null::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    timeout_milliseconds := 2000
  );
  return new;
end;
$$;

create trigger notify_chat_trigger
after insert on public.messages
for each row
execute function public.notify_chat_on_message();

-- 9. Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id        BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token     TEXT NOT NULL,
  platform  TEXT NOT NULL DEFAULT 'expo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_insert_own" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_select_own" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete_own" ON push_tokens;

CREATE POLICY "push_tokens_insert_own" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_select_own" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);
