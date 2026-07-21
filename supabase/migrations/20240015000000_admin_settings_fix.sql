-- Migration 15: Create _settings table for admin code validation
-- handle_new_user (migrations 12b & 14) references _settings but
-- the table was never created — admin registration silently broken.

-- 1. Create _settings table (key-value config)
create table if not exists _settings (
  key text primary key,
  value text not null
);

-- 2. Seed default admin secret code
insert into _settings (key, value)
values ('admin_secret_code', 'pr-admin2026')
on conflict (key) do nothing;

-- 3. Enable RLS; no policies needed — handle_new_user is security definer
--    and bypasses RLS. Direct Data API access blocked by default.
alter table _settings enable row level security;

-- 4. Revoke all from public/anonymous so settings table is invisible
--    through the Data API
revoke all on table _settings from anon, authenticated;
