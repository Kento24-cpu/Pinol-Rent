-- Migration 18: Fix infinite recursion in RLS admin policies
-- The pattern `exists (select 1 from profiles where ...)` inside a policy ON profiles
-- causes infinite recursion. Solution: SECURITY DEFINER helper function bypasses RLS.

-- Create SECURITY DEFINER function that checks admin role without triggering RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Grant execute so RLS policy evaluation can call it
grant execute on function public.is_admin to authenticated, anon, service_role;

-- Recreate profiles admin policy using the helper (breaks recursion)
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all using (public.is_admin());

-- Recreate cars admin policy (already safe, but use helper for consistency)
drop policy if exists "cars_admin_all" on cars;
create policy "cars_admin_all" on cars
  for all using (public.is_admin());

-- Recreate bookings admin policy (same)
drop policy if exists "bookings_admin_all" on bookings;
create policy "bookings_admin_all" on bookings
  for all using (public.is_admin());
