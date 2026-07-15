-- Migration 10: Notification preferences

create table if not exists notification_prefs (
  user_id uuid primary key references profiles on delete cascade,
  chat_push boolean not null default true,
  booking_push boolean not null default true,
  marketing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notification_prefs enable row level security;

create policy "notification_prefs_select_own" on notification_prefs
  for select using (auth.uid() = user_id);

create policy "notification_prefs_insert_own" on notification_prefs
  for insert with check (auth.uid() = user_id);

create policy "notification_prefs_update_own" on notification_prefs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- trigger for updated_at
create or replace function sync_notification_prefs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_notification_prefs_updated_at
  before update on notification_prefs
  for each row execute function sync_notification_prefs_updated_at();
