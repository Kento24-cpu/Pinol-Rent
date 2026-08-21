-- Migration 29: Remove hardcoded admin secret fallback (security hardening)
-- ID-01: the _settings seed 'MprAdminPass' (migration 15) allowed anyone with repo
-- access to register as admin, because get_admin_secret_code() fell back to it.
-- We (1) rotate the stored value and (2) make get_admin_secret_code() depend ONLY
-- on the app.settings.admin_secret_code GUC, removing the _settings fallback entirely.

-- 1. Rotate the stored value so the old repo literal is no longer valid.
update _settings
set value = gen_random_uuid()::text
where key = 'admin_secret_code';

-- 2. Helper reads ONLY the GUC. If unset, returns null, which disables admin
--    self-registration. Ops must set app.settings.admin_secret_code in the
--    Supabase dashboard (ALTER DATABASE ... SET ...) to enable it.
create or replace function public.get_admin_secret_code()
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_code text;
begin
  begin
    v_code := nullif(current_setting('app.settings.admin_secret_code', true), '');
  exception when others then
    v_code := null;
  end;
  return v_code;
end;
$$;
