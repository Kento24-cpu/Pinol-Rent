-- Migration 29: Revoke execute on sensitive functions
-- get_admin_secret_code was created (migration 03) without revoking the default
-- PUBLIC execute grant: anyone (even anon) could call it over REST and read the
-- admin registration code (verified live: it returned the code unauthenticated).
-- It is only consumed by handle_new_user (SECURITY DEFINER, runs as owner), so
-- revoking from anon AND authenticated does not break the sign-up trigger.

revoke execute on function public.get_admin_secret_code() from anon, authenticated;

-- Defense in depth: the admin RPCs already enforce is_admin() guards, but anon
-- should not be able to reach them at all.
revoke execute on function public.get_pending_payment_intents() from anon;
revoke execute on function public.decrypt_payment_preview(bigint) from anon;
revoke execute on function public.approve_payment_intent(bigint) from anon;
revoke execute on function public.decline_payment_intent(bigint) from anon;
revoke execute on function public.get_all_bookings() from anon;
revoke execute on function public.expire_stale_payment_intents() from anon;

-- Car RPCs (migration 05) are only invoked by authenticated users
-- (publish.tsx / edit/[id].tsx). Guarded with existence checks so this
-- migration is safe to apply even if 05 was skipped.
do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'publish_car' and pronamespace = 'public'::regnamespace
  ) then
    revoke execute on function public.publish_car(
      text, text, integer, text, numeric, numeric, text, text, bigint, boolean, text, bigint[]
    ) from anon;
  end if;

  if exists (
    select 1 from pg_proc
    where proname = 'update_car' and pronamespace = 'public'::regnamespace
  ) then
    revoke execute on function public.update_car(
      bigint, text, text, integer, text, numeric, numeric, text, text, bigint, boolean, text, bigint[]
    ) from anon;
  end if;
end $$;
