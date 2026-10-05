-- Melo Chat Lite V44
-- Create the canonical public.notifications table used by:
-- - in-app notification bell
-- - Direct Chat / Support notification producers
-- - Database Webhook -> send-web-push Edge Function
-- Safe to run more than once.

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'system',
  actor_id uuid,
  entity_id uuid,
  title text,
  body text,
  href text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Keep this migration compatible with a partially-created notifications table.
alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists type text default 'system';
alter table public.notifications add column if not exists actor_id uuid;
alter table public.notifications add column if not exists entity_id uuid;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists href text;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.notifications add column if not exists created_at timestamptz default now();

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, created_at desc);
create index if not exists notifications_type_idx
  on public.notifications(type, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_own_select_v44 on public.notifications;
create policy notifications_own_select_v44
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_own_update_v44 on public.notifications;
create policy notifications_own_update_v44
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Do not grant direct INSERT to authenticated users. Notification rows are
-- created by trusted SECURITY DEFINER functions / server-side code.
grant select, update on table public.notifications to authenticated;

-- Compatibility writer used by the existing Melo migrations. Keeping it here
-- makes this migration self-healing if an earlier push migration was skipped.
create or replace function public.melo_insert_notification_compat(
  p_recipient uuid,
  p_type text,
  p_actor uuid,
  p_entity uuid,
  p_title text,
  p_body text,
  p_href text,
  p_metadata jsonb default '{}'::jsonb,
  p_created_at timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_meta jsonb := coalesce(p_metadata,'{}'::jsonb)
    || jsonb_build_object(
      'href', p_href,
      'type', p_type,
      'actor_id', p_actor,
      'entity_id', p_entity
    );
begin
  insert into public.notifications(
    user_id,
    type,
    actor_id,
    entity_id,
    title,
    body,
    href,
    is_read,
    metadata,
    created_at
  ) values (
    p_recipient,
    coalesce(nullif(trim(p_type),''),'system'),
    p_actor,
    p_entity,
    p_title,
    p_body,
    p_href,
    false,
    v_meta,
    coalesce(p_created_at, now())
  );
  return true;
exception when others then
  raise warning 'melo_insert_notification_compat failed: %', sqlerrm;
  return false;
end;
$$;

revoke all on function public.melo_insert_notification_compat(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz) from public;

commit;
notify pgrst, 'reload schema';
