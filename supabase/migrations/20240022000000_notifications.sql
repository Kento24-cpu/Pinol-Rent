create table if not exists public.notifications (
  id bigint primary key generated always as identity,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications_select" on notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update" on notifications
  for update using (auth.uid() = user_id);

create index if not exists idx_notifications_user_read on notifications(user_id, read);
create index if not exists idx_notifications_created on notifications(created_at desc);
