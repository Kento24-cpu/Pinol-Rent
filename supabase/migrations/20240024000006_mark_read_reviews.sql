-- Migration 30: Read receipts RPC + public reviews
-- 1. messages_update_own only lets the sender update their rows, so the client
--    could never mark the other participant's messages as read. This RPC runs
--    with SECURITY DEFINER and derives the reader from auth.uid().
-- 2. Reviews were only visible to the renter/owner of the booking, so the
--    review section on the car detail was empty for everyone else.

create or replace function public.mark_messages_read(p_conversation_id bigint)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using hint = 'login_required';
  end if;

  update messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id != auth.uid()
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

drop policy if exists "reviews_select_participant" on reviews;
create policy "reviews_select_participant" on reviews
  for select
  using (auth.role() = 'authenticated');
