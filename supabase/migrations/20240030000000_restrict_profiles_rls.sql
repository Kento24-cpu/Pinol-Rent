-- Migration 30: Restrict profiles reads to authenticated users (security hardening)
-- ID-02: 'profiles_read_all' used `auth.role() IS NOT NULL`, which is always true
-- for requests made with the public anon key, exposing PII (phone) and bank data
-- (bank_account_number, bank_account_holder) to anonymous clients.
-- Recreate the policy requiring an authenticated session instead.

drop policy if exists "profiles_read_all" on profiles;
create policy "profiles_read_all" on profiles
  for select using (auth.uid() is not null);
