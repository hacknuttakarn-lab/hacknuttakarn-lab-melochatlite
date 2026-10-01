-- Melo Chat Lite V6
-- Reliable USER notification feed for:
--   1) Melo Chat Support replies
--   2) Verification approve / reject / request-more-info decisions
--
-- This migration intentionally derives notification state from the source-of-truth
-- support_messages / verification_requests tables. It does not depend on the
-- deployed shape of public.notifications, so the user header keeps working even
-- on installations whose legacy notifications schema differs.

begin;

alter table public.support_messages
  add column if not exists read_at timestamptz;

alter table public.verification_requests
  add column if not exists decision_notification_read_at timestamptz;

create index if not exists support_messages_member_unread_source_idx
  on public.support_messages(thread_id, sender_role, created_at desc)
  where sender_role = 'admin';

-- A new admin decision must become unread again, even when the same verification
-- request row is reused for resubmission/review.
create or replace function public.melo_reset_verification_decision_notification_read()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('approved','rejected','more_info','needs_info') then
    new.decision_notification_read_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_melo_reset_verification_decision_notification_read
  on public.verification_requests;
create trigger trg_melo_reset_verification_decision_notification_read
before update of status on public.verification_requests
for each row execute function public.melo_reset_verification_decision_notification_read();

-- Source-backed notification rows for the signed-in member.
-- These rows are consumed by Header.tsx and merged with legacy public.notifications.
create or replace function public.get_my_system_notification_feed(p_limit integer default 24)
returns table(
  source_key text,
  source_kind text,
  entity_id uuid,
  support_thread_id uuid,
  title_key text,
  body_key text,
  href text,
  created_at timestamptz,
  unread boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit,24),50));
begin
  if v_user is null then
    return;
  end if;

  return query
  with support_rows as (
    select
      ('support:' || sm.id::text)::text as source_key,
      'support_reply'::text as source_kind,
      sm.id as entity_id,
      sm.thread_id as support_thread_id,
      'support_reply'::text as title_key,
      'support_reply'::text as body_key,
      '/support/chat'::text as href,
      sm.created_at,
      (sm.read_at is null) as unread
    from public.support_messages sm
    join public.support_threads st on st.id = sm.thread_id
    where st.user_id = v_user
      and sm.sender_role = 'admin'
  ),
  verification_rows as (
    select
      ('verification:' || vr.id::text)::text as source_key,
      case vr.status
        when 'approved' then 'verification_approved'
        when 'rejected' then 'verification_rejected'
        else 'verification_needs_info'
      end::text as source_kind,
      vr.id as entity_id,
      null::uuid as support_thread_id,
      case vr.status
        when 'approved' then 'verification_approved'
        when 'rejected' then 'verification_rejected'
        else 'verification_needs_info'
      end::text as title_key,
      case vr.status
        when 'approved' then 'verification_approved'
        when 'rejected' then 'verification_rejected'
        else 'verification_needs_info'
      end::text as body_key,
      '/verify'::text as href,
      coalesce(vr.reviewed_at, vr.updated_at) as created_at,
      (vr.decision_notification_read_at is null) as unread
    from public.verification_requests vr
    where vr.user_id = v_user
      and vr.status in ('approved','rejected','more_info','needs_info')
      and coalesce(vr.reviewed_at, vr.updated_at) is not null
  )
  select x.source_key, x.source_kind, x.entity_id, x.support_thread_id,
         x.title_key, x.body_key, x.href, x.created_at, x.unread
  from (
    select * from support_rows
    union all
    select * from verification_rows
  ) x
  order by x.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.get_my_system_notification_feed(integer) to authenticated;

-- Mark a source-backed notification read. Support chat itself also marks an
-- entire thread read, but this lets the notification click clear immediately.
create or replace function public.mark_my_system_notification_read(p_source_key text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null or coalesce(p_source_key,'') = '' then
    return;
  end if;

  if p_source_key like 'support:%' then
    begin
      v_id := substring(p_source_key from 9)::uuid;
    exception when others then
      return;
    end;

    update public.support_messages sm
       set read_at = coalesce(sm.read_at, now())
      from public.support_threads st
     where sm.id = v_id
       and st.id = sm.thread_id
       and st.user_id = v_user
       and sm.sender_role = 'admin';

  elsif p_source_key like 'verification:%' then
    begin
      v_id := substring(p_source_key from 14)::uuid;
    exception when others then
      return;
    end;

    update public.verification_requests vr
       set decision_notification_read_at = coalesce(vr.decision_notification_read_at, now())
     where vr.id = v_id
       and vr.user_id = v_user;
  end if;
end;
$$;

grant execute on function public.mark_my_system_notification_read(text) to authenticated;

commit;
