-- Migration 6: Chat system (conversations + messages)

-- Conversations between car owners and renters
CREATE TABLE conversations (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  car_id          BIGINT REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  renter_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id      BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_renter ON conversations(renter_id);
CREATE INDEX idx_conversations_owner ON conversations(owner_id);
CREATE INDEX idx_conversations_car ON conversations(car_id);

-- Messages within conversations
CREATE TABLE messages (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  attachment_url  TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "conversations_select_participant" ON conversations
  FOR SELECT USING (
    auth.uid() = renter_id OR auth.uid() = owner_id
  );

CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = renter_id OR auth.uid() = owner_id
  );

CREATE POLICY "conversations_update_last_message" ON conversations
  FOR UPDATE USING (
    auth.uid() = renter_id OR auth.uid() = owner_id
  );

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

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-attachments', 'chat-attachments', false, 5242880, '{"image/png","image/jpeg","image/webp","image/heic","image/heif","application/pdf"}')
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_attachments_select_participant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-attachments'
    AND auth.role() = 'authenticated'
  );

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

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Habilitar pg_net para HTTP requests async
-- create extension if not exists pg_net with schema extensions;

-- Trigger function: llama a Edge Function via pg_net cuando se inserta un mensaje
create or replace function public.notify_chat_on_message()
returns trigger
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
begin
  perform net.http_post(
    url := 'https://rqmobdrdkftdepqrdymo.supabase.co/functions/v1/notify-chat',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'schema', 'public',
      'record', row_to_json(new)::jsonb,
      'old_record', null::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbW9iZHJka2Z0ZGVwcXJkeW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjc1MzE5OSwiZXhwIjoyMDk4MzI5MTk5fQ.HIj53YrICSTYMSUxKtAHA_G1H1h4fwHXM53L80Uj_Dw'
    ),
    timeout_milliseconds := 2000
  );
  return new;
end;
$$;

-- Trigger en messages
create trigger notify_chat_trigger
after insert on public.messages
for each row
execute function public.notify_chat_on_message();

-- Push notification tokens
CREATE TABLE push_tokens (
  id        BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token     TEXT NOT NULL,
  platform  TEXT NOT NULL DEFAULT 'expo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_insert_own" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_select_own" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);
