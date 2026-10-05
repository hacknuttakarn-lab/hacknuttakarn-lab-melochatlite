-- Melo Chat Lite
-- Hotfix: cancel_my_account_deletion_v2() returned an ambiguous requested_at reference.
-- PostgreSQL PL/pgSQL output-column variables share names with table columns,
-- so qualify the RETURNING columns with the UPDATE target alias.

create or replace function public.cancel_my_account_deletion_v2()
returns table(
  status text,
  requested_at timestamptz,
  scheduled_for timestamptz,
  failure_message text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_requested_at timestamptz;
  v_scheduled_for timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.user_deletion_requests as udr
  set cancelled_at = now(),
      cancelled_by = v_user_id,
      failure_message = null
  where udr.user_id = v_user_id
    and udr.cancelled_at is null
    and udr.delete_after > now()
  returning udr.requested_at, udr.delete_after
  into v_requested_at, v_scheduled_for;

  if not found then
    raise exception 'No cancellable account deletion request';
  end if;

  return query
  select
    'cancelled'::text,
    v_requested_at,
    v_scheduled_for,
    null::text;
end;
$$;

revoke all on function public.cancel_my_account_deletion_v2() from public, anon;
grant execute on function public.cancel_my_account_deletion_v2() to authenticated;
