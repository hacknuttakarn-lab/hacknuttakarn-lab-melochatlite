-- Melo Chat Lite — Support Inbox V2
-- Reuses support_threads/support_messages/profiles/admin_users/notifications.
-- Adds persistent read state, shared admin Saved Replies, attachment metadata,
-- notification triggers and private Saved Reply image storage.

begin;

alter table public.support_messages
  add column if not exists read_at timestamptz;
create index if not exists support_messages_unread_idx
  on public.support_messages(thread_id, sender_role, read_at, created_at desc);

-- Keep support admin access aligned with the existing Admin Center roles while
-- also allowing a future JSON permission without needing another schema change.
create or replace function public.support_is_admin(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path=public as $$
 select exists(
   select 1 from public.admin_users a
   where a.user_id=p_user
     and coalesce(a.is_active,true)=true
     and (
       a.role in('admin','super_admin')
       or coalesce((a.permissions->>'support_chat_view')::boolean,false)
     )
 );
$$;

create table if not exists public.support_saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_saved_reply_attachments (
  id uuid primary key default gen_random_uuid(),
  saved_reply_id uuid not null references public.support_saved_replies(id) on delete cascade,
  storage_bucket text not null default 'support-saved-replies',
  storage_path text not null,
  file_name text,
  mime_type text,
  sort_order smallint not null check (sort_order between 1 and 3),
  created_at timestamptz not null default now(),
  unique(saved_reply_id, sort_order),
  unique(storage_bucket, storage_path)
);

create or replace function public.support_saved_reply_attachment_limit()
returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.support_saved_reply_attachments a
      where a.saved_reply_id=new.saved_reply_id and a.id<>new.id) >= 3 then
    raise exception 'A saved reply can contain at most 3 images';
  end if;
  return new;
end;
$$;
drop trigger if exists support_saved_reply_attachment_limit_trg on public.support_saved_reply_attachments;
create trigger support_saved_reply_attachment_limit_trg
before insert or update on public.support_saved_reply_attachments
for each row execute function public.support_saved_reply_attachment_limit();

create or replace function public.support_saved_reply_touch()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;
drop trigger if exists support_saved_reply_touch_trg on public.support_saved_replies;
create trigger support_saved_reply_touch_trg
before update on public.support_saved_replies
for each row execute function public.support_saved_reply_touch();

alter table public.support_saved_replies enable row level security;
alter table public.support_saved_reply_attachments enable row level security;

drop policy if exists support_saved_replies_admin_select on public.support_saved_replies;
create policy support_saved_replies_admin_select on public.support_saved_replies
for select to authenticated using(public.support_is_admin());
drop policy if exists support_saved_replies_admin_insert on public.support_saved_replies;
create policy support_saved_replies_admin_insert on public.support_saved_replies
for insert to authenticated with check(public.support_is_admin() and (created_by is null or created_by=auth.uid()));
drop policy if exists support_saved_replies_admin_update on public.support_saved_replies;
create policy support_saved_replies_admin_update on public.support_saved_replies
for update to authenticated using(public.support_is_admin()) with check(public.support_is_admin());
drop policy if exists support_saved_replies_admin_delete on public.support_saved_replies;
create policy support_saved_replies_admin_delete on public.support_saved_replies
for delete to authenticated using(public.support_is_admin());

drop policy if exists support_saved_reply_attachments_admin_select on public.support_saved_reply_attachments;
create policy support_saved_reply_attachments_admin_select on public.support_saved_reply_attachments
for select to authenticated using(public.support_is_admin());
drop policy if exists support_saved_reply_attachments_admin_insert on public.support_saved_reply_attachments;
create policy support_saved_reply_attachments_admin_insert on public.support_saved_reply_attachments
for insert to authenticated with check(public.support_is_admin());
drop policy if exists support_saved_reply_attachments_admin_update on public.support_saved_reply_attachments;
create policy support_saved_reply_attachments_admin_update on public.support_saved_reply_attachments
for update to authenticated using(public.support_is_admin()) with check(public.support_is_admin());
drop policy if exists support_saved_reply_attachments_admin_delete on public.support_saved_reply_attachments;
create policy support_saved_reply_attachments_admin_delete on public.support_saved_reply_attachments
for delete to authenticated using(public.support_is_admin());

-- Private bucket: images are accessed through short-lived signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('support-saved-replies','support-saved-replies',false,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists support_saved_reply_storage_select on storage.objects;
create policy support_saved_reply_storage_select on storage.objects
for select to authenticated using(bucket_id='support-saved-replies' and public.support_is_admin());
drop policy if exists support_message_attachment_member_select on storage.objects;
create policy support_message_attachment_member_select on storage.objects
for select to authenticated using(
  bucket_id='support-saved-replies' and exists(
    select 1 from public.support_messages m
    join public.support_threads t on t.id=m.thread_id
    cross join lateral jsonb_array_elements(coalesce(m.metadata->'attachments','[]'::jsonb)) a
    where t.user_id=auth.uid() and a->>'bucket'=bucket_id and a->>'path'=name
  )
);

drop policy if exists support_saved_reply_storage_insert on storage.objects;
create policy support_saved_reply_storage_insert on storage.objects
for insert to authenticated with check(bucket_id='support-saved-replies' and public.support_is_admin());
drop policy if exists support_saved_reply_storage_update on storage.objects;
create policy support_saved_reply_storage_update on storage.objects
for update to authenticated using(bucket_id='support-saved-replies' and public.support_is_admin()) with check(bucket_id='support-saved-replies' and public.support_is_admin());
drop policy if exists support_saved_reply_storage_delete on storage.objects;
create policy support_saved_reply_storage_delete on storage.objects
for delete to authenticated using(bucket_id='support-saved-replies' and public.support_is_admin());

-- Admin inbox view: real profile avatar, package and per-thread unread count.
create or replace view public.support_admin_threads as
select
  t.id,t.user_id,t.subject,t.status,t.created_at,t.updated_at,u.email as member_email,
  coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),nullif(p.display_name,''),u.raw_user_meta_data->>'full_name',u.email) as member_name,
  coalesce(u.raw_user_meta_data->>'avatar_url',case when cardinality(p.photo_paths)>0 then p.photo_paths[1] else null end) as avatar_url,
  coalesce(sp.name,'Free') as plan_name,
  (select count(*)::int from public.support_messages m where m.thread_id=t.id and m.sender_role='member' and m.read_at is null) as unread_count,
  (select m.body from public.support_messages m where m.thread_id=t.id order by m.created_at desc limit 1) as last_message,
  (select m.created_at from public.support_messages m where m.thread_id=t.id order by m.created_at desc limit 1) as last_message_at
from public.support_threads t
join auth.users u on u.id=t.user_id
left join public.profiles p on p.id=t.user_id
left join lateral (
  select us.plan_id from public.user_subscriptions us
  where us.user_id=t.user_id and us.status='active'
  order by us.expires_at desc nulls last limit 1
) active_sub on true
left join public.subscription_plans sp on sp.id=active_sub.plan_id
where public.support_is_admin();
grant select on public.support_admin_threads to authenticated;

create or replace function public.support_mark_thread_read(p_thread_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not public.support_is_admin() then raise exception 'Admin access required'; end if;
  update public.support_messages set read_at=now()
  where thread_id=p_thread_id and sender_role='member' and read_at is null;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
grant execute on function public.support_mark_thread_read(uuid) to authenticated;

create or replace function public.support_mark_my_thread_read(p_thread_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not exists(select 1 from public.support_threads t where t.id=p_thread_id and t.user_id=auth.uid()) then
    raise exception 'Thread access denied';
  end if;
  update public.support_messages set read_at=now()
  where thread_id=p_thread_id and sender_role='admin' and read_at is null;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
grant execute on function public.support_mark_my_thread_read(uuid) to authenticated;

create or replace function public.support_admin_unread_total()
returns integer language sql stable security definer set search_path=public as $$
 select case when public.support_is_admin() then
   (select count(*)::int from public.support_messages where sender_role='member' and read_at is null)
 else 0 end;
$$;
grant execute on function public.support_admin_unread_total() to authenticated;

create or replace function public.support_my_unread_total()
returns integer language sql stable security definer set search_path=public as $$
 select count(*)::int from public.support_messages m
 join public.support_threads t on t.id=m.thread_id
 where t.user_id=auth.uid() and m.sender_role='admin' and m.read_at is null;
$$;
grant execute on function public.support_my_unread_total() to authenticated;

-- Generic notification insert that tolerates the deployed notifications schema.
create or replace function public.support_message_notifications()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare
  v_thread public.support_threads%rowtype;
  v_admin record;
  v_name text;
  v_payload jsonb;
  v_target uuid;
begin
  select * into v_thread from public.support_threads where id=new.thread_id;
  if v_thread.id is null then return new; end if;

  if new.sender_role='member' then
    select coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),nullif(p.display_name,''),u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1),'Melo member')
      into v_name from auth.users u left join public.profiles p on p.id=u.id where u.id=v_thread.user_id;
    for v_admin in
      select a.user_id from public.admin_users a
      where coalesce(a.is_active,true)=true and (a.role in('admin','super_admin') or coalesce((a.permissions->>'support_chat_view')::boolean,false))
    loop
      v_payload=jsonb_build_object(
        'user_id',v_admin.user_id,'recipient_id',v_admin.user_id,'recipient_user_id',v_admin.user_id,
        'type','support_message_admin','notification_type','support_message_admin','actor_id',v_thread.user_id,'entity_id',new.id,
        'title','ข้อความใหม่จาก Melo Chat Support','body',coalesce(v_name,'Melo member')||' ส่งข้อความถึงทีมสนับสนุน',
        'message',coalesce(v_name,'Melo member')||' ส่งข้อความถึงทีมสนับสนุน','is_read',false,'read',false,'created_at',now(),
        'metadata',jsonb_build_object('href','/admin?support_thread='||v_thread.id::text,'support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','admin_inbox','actor_id',v_thread.user_id,'type','support_message_admin')
      );
      execute 'insert into public.notifications select * from jsonb_populate_record(null::public.notifications,$1)' using v_payload;
    end loop;
  else
    v_target=v_thread.user_id;
    v_payload=jsonb_build_object(
      'user_id',v_target,'recipient_id',v_target,'recipient_user_id',v_target,
      'type','support_message_user','notification_type','support_message_user','entity_id',new.id,
      'title','Melo Chat Support','body','ทีมสนับสนุนตอบกลับข้อความของคุณ','message','ทีมสนับสนุนตอบกลับข้อความของคุณ',
      'is_read',false,'read',false,'created_at',now(),
      'metadata',jsonb_build_object('href','/support/chat','support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','member_support','type','support_message_user')
    );
    execute 'insert into public.notifications select * from jsonb_populate_record(null::public.notifications,$1)' using v_payload;
  end if;
  return new;
exception when undefined_table then return new;
when others then raise warning 'Support notification failed: %',sqlerrm; return new;
end;
$$;
drop trigger if exists support_messages_notification_trg on public.support_messages;
create trigger support_messages_notification_trg
after insert on public.support_messages
for each row execute function public.support_message_notifications();

-- Realtime publication: idempotent add.
do $$ begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null;
end $$;

commit;
