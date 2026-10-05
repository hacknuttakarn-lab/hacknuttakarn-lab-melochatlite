-- Melo Chat Lite
-- Self-service account deletion: 7-day grace period, cancellation, and automatic permanent deletion.

create table if not exists public.user_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  delete_after timestamptz not null,
  requested_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null
);

alter table public.user_deletion_requests add column if not exists reason text;
alter table public.user_deletion_requests add column if not exists request_source text not null default 'admin';
alter table public.user_deletion_requests add column if not exists failure_message text;

alter table public.user_deletion_requests enable row level security;

-- The client reads status through an RPC only. Keep the table itself private.
revoke all on table public.user_deletion_requests from anon, authenticated;

-- Return the current user's deletion state in the shape already expected by Settings.
drop function if exists public.get_my_account_deletion_status_v2();
create function public.get_my_account_deletion_status_v2()
returns table(
  status text,
  requested_at timestamptz,
  scheduled_for timestamptz,
  failure_message text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    case
      when d.cancelled_at is not null then 'cancelled'
      when d.delete_after <= now() then 'processing'
      else 'pending'
    end as status,
    d.requested_at,
    d.delete_after as scheduled_for,
    d.failure_message
  from public.user_deletion_requests d
  where d.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_account_deletion_status_v2() from public, anon;
grant execute on function public.get_my_account_deletion_status_v2() to authenticated;

-- A member can schedule only their own account. The server fixes delete_after to exactly 7 days.
drop function if exists public.schedule_my_account_deletion_v2(text);
create function public.schedule_my_account_deletion_v2(p_reason text default null)
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
  v_requested_at timestamptz := now();
  v_scheduled_for timestamptz := now() + interval '7 days';
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_deletion_requests (
    user_id,
    requested_at,
    delete_after,
    requested_by,
    cancelled_at,
    cancelled_by,
    reason,
    request_source,
    failure_message
  ) values (
    v_user_id,
    v_requested_at,
    v_scheduled_for,
    v_user_id,
    null,
    null,
    nullif(btrim(coalesce(p_reason, '')), ''),
    'self',
    null
  )
  on conflict (user_id) do update set
    requested_at = excluded.requested_at,
    delete_after = excluded.delete_after,
    requested_by = excluded.requested_by,
    cancelled_at = null,
    cancelled_by = null,
    reason = excluded.reason,
    request_source = 'self',
    failure_message = null;

  return query
  select 'pending'::text, v_requested_at, v_scheduled_for, null::text;
end;
$$;

revoke all on function public.schedule_my_account_deletion_v2(text) from public, anon;
grant execute on function public.schedule_my_account_deletion_v2(text) to authenticated;

-- The member may cancel during the 7-day grace period, before permanent deletion starts.
drop function if exists public.cancel_my_account_deletion_v2();
create function public.cancel_my_account_deletion_v2()
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

  update public.user_deletion_requests
  set cancelled_at = now(),
      cancelled_by = v_user_id,
      failure_message = null
  where user_id = v_user_id
    and cancelled_at is null
    and delete_after > now()
  returning requested_at, delete_after
  into v_requested_at, v_scheduled_for;

  if not found then
    raise exception 'No cancellable account deletion request';
  end if;

  return query
  select 'cancelled'::text, v_requested_at, v_scheduled_for, null::text;
end;
$$;

revoke all on function public.cancel_my_account_deletion_v2() from public, anon;
grant execute on function public.cancel_my_account_deletion_v2() to authenticated;

-- Server-side worker. Never exposed to the browser.
create or replace function public.process_due_self_account_deletions()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select d.user_id
    from public.user_deletion_requests d
    join auth.users u on u.id = d.user_id
    where d.cancelled_at is null
      and d.request_source = 'self'
      and d.delete_after <= now()
    order by d.delete_after
    for update of d skip locked
  loop
    begin
      delete from auth.users where id = r.user_id;
      v_count := v_count + 1;
    exception when others then
      update public.user_deletion_requests
      set failure_message = sqlerrm
      where user_id = r.user_id;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.process_due_self_account_deletions() from public, anon, authenticated;

-- Supabase supports pg_cron. Check hourly so an account is removed shortly after its 7-day deadline.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'melo_process_due_self_account_deletions') then
    perform cron.unschedule('melo_process_due_self_account_deletions');
  end if;

  perform cron.schedule(
    'melo_process_due_self_account_deletions',
    '23 * * * *',
    'select public.process_due_self_account_deletions();'
  );
end $$;

-- Make PostgREST notice the new RPCs immediately.
notify pgrst, 'reload schema';
