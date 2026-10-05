-- Melo Chat Lite V43
-- 1) Private chat-media bucket + upload/read policies for image attachments.
-- 2) Generic direct-message notification rows so Web Push can work while the site is closed.
-- 3) Server-side restrictive SELECT guard for Free members on direct message tables (where RLS is already enabled).
--
-- Requires the package entitlement migration (V25) and push compatibility helper (V22) to have been applied first.

begin;

-- ---------------------------------------------------------------------------
-- CHAT IMAGE STORAGE
-- ---------------------------------------------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'chat-media',
  'chat-media',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists melo_chat_media_read_authenticated_v43 on storage.objects;
create policy melo_chat_media_read_authenticated_v43
on storage.objects
for select
to authenticated
using(bucket_id='chat-media');

drop policy if exists melo_chat_media_insert_own_v43 on storage.objects;
create policy melo_chat_media_insert_own_v43
on storage.objects
for insert
to authenticated
with check(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists melo_chat_media_update_own_v43 on storage.objects;
create policy melo_chat_media_update_own_v43
on storage.objects
for update
to authenticated
using(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists melo_chat_media_delete_own_v43 on storage.objects;
create policy melo_chat_media_delete_own_v43
on storage.objects
for delete
to authenticated
using(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- HELPERS FOR SCHEMA-COMPATIBLE DIRECT MESSAGE RECIPIENT LOOKUP
-- ---------------------------------------------------------------------------
create or replace function public.melo_try_uuid_v43(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if nullif(trim(coalesce(p_value,'')),'') is null then return null; end if;
  return trim(p_value)::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.melo_direct_message_recipient_v43(
  p_conversation uuid,
  p_sender uuid,
  p_message jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v uuid;
  v_table text;
  v_conv_col text;
  v_member jsonb;
  v_row jsonb;
  v_key text;
begin
  -- Some schemas store the recipient directly on the message row.
  foreach v_key in array array[
    'recipient_id','recipient_user_id','receiver_id','receiver_user_id',
    'to_user_id','target_user_id','other_user_id','participant_user_id'
  ] loop
    v:=public.melo_try_uuid_v43(p_message->>v_key);
    if v is not null and v<>p_sender then return v; end if;
  end loop;

  if p_conversation is null then return null; end if;

  -- Membership-table layouts.
  foreach v_table in array array[
    'chat_conversation_members','conversation_members','chat_members','direct_chat_members'
  ] loop
    if to_regclass('public.'||v_table) is null then continue; end if;

    v_conv_col:=null;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='conversation_id') then
      v_conv_col:='conversation_id';
    elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='chat_id') then
      v_conv_col:='chat_id';
    end if;
    if v_conv_col is null then continue; end if;

    for v_member in execute format(
      'select to_jsonb(m) from public.%I m where (to_jsonb(m)->>%L)=$1::text',
      v_table,v_conv_col
    ) using p_conversation loop
      foreach v_key in array array['user_id','member_user_id','participant_user_id','profile_id'] loop
        v:=public.melo_try_uuid_v43(v_member->>v_key);
        if v is not null and v<>p_sender then return v; end if;
      end loop;
    end loop;
  end loop;

  -- Two-party conversation-row layouts.
  foreach v_table in array array[
    'chat_conversations','conversations','direct_conversations','direct_chats','chats'
  ] loop
    if to_regclass('public.'||v_table) is null then continue; end if;

    v_conv_col:=null;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='id') then
      v_conv_col:='id';
    elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='conversation_id') then
      v_conv_col:='conversation_id';
    elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='chat_id') then
      v_conv_col:='chat_id';
    end if;
    if v_conv_col is null then continue; end if;

    execute format(
      'select to_jsonb(c) from public.%I c where (to_jsonb(c)->>%L)=$1::text limit 1',
      v_table,v_conv_col
    ) into v_row using p_conversation;

    if v_row is null then continue; end if;

    foreach v_key in array array[
      'user_id','other_user_id','user1_id','user2_id','user_1_id','user_2_id',
      'user_a_id','user_b_id','member_1_id','member_2_id','member_a_id','member_b_id',
      'participant_1_id','participant_2_id','participant_a_id','participant_b_id',
      'customer_user_id','partner_user_id','owner_user_id'
    ] loop
      v:=public.melo_try_uuid_v43(v_row->>v_key);
      if v is not null and v<>p_sender then return v; end if;
    end loop;
  end loop;

  return null;
end;
$$;
revoke all on function public.melo_direct_message_recipient_v43(uuid,uuid,jsonb) from public;

-- ---------------------------------------------------------------------------
-- CREATE A GENERIC NOTIFICATION ROW AFTER A DIRECT MESSAGE
-- This is intentionally content-free. Paid users can still see previews while
-- the app is open from the realtime chat watcher; closed-app Web Push has a
-- privacy-safe body, and Free users never receive message text.
-- ---------------------------------------------------------------------------
create or replace function public.melo_direct_message_notification_v43()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  j jsonb:=to_jsonb(new);
  v_sender uuid;
  v_recipient uuid;
  v_conversation uuid;
  v_message_id uuid;
  v_sender_profile jsonb;
  v_recipient_profile jsonb;
  v_sender_name text;
  v_lang text;
  v_body text;
  v_href text;
  v_created_at timestamptz:=now();
begin
  v_sender:=coalesce(public.melo_try_uuid_v43(j->>'sender_id'),public.melo_try_uuid_v43(j->>'sender_user_id'),public.melo_try_uuid_v43(j->>'from_user_id'),public.melo_try_uuid_v43(j->>'author_id'),auth.uid());
  v_conversation:=coalesce(public.melo_try_uuid_v43(j->>'conversation_id'),public.melo_try_uuid_v43(j->>'chat_id'));
  v_message_id:=coalesce(public.melo_try_uuid_v43(j->>'id'),public.melo_try_uuid_v43(j->>'message_id'));
  begin v_created_at:=coalesce((j->>'created_at')::timestamptz,now()); exception when others then v_created_at:=now(); end;
  if v_sender is null or v_conversation is null then return new; end if;

  v_recipient:=public.melo_direct_message_recipient_v43(v_conversation,v_sender,j);
  if v_recipient is null or v_recipient=v_sender then return new; end if;

  if to_regclass('public.profiles') is not null then
    execute 'select to_jsonb(p) from public.profiles p where p.id=$1 limit 1' into v_sender_profile using v_sender;
    execute 'select to_jsonb(p) from public.profiles p where p.id=$1 limit 1' into v_recipient_profile using v_recipient;
  end if;

  v_sender_name:=coalesce(nullif(trim(concat_ws(' ',v_sender_profile->>'first_name',v_sender_profile->>'last_name')),''),nullif(trim(v_sender_profile->>'display_name'),''),nullif(trim(v_sender_profile->>'full_name'),''),'Melo member');
  v_lang:=lower(split_part(replace(coalesce(v_recipient_profile->>'primary_language','en'),'_','-'),'-',1));
  v_body:=case v_lang when 'th' then 'คุณมีข้อความใหม่ เปิด Melo Chat เพื่อดูรายละเอียด' when 'de' then 'Du hast eine neue Nachricht. Öffne Melo Chat für weitere Details.' else 'You have a new message. Open Melo Chat to view the details.' end;
  v_href:='/chat?type=direct&room='||v_conversation::text;

  if to_regprocedure('public.melo_insert_notification_compat(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz)') is not null then
    perform public.melo_insert_notification_compat(v_recipient,'direct_message',v_sender,v_message_id,v_sender_name,v_body,v_href,jsonb_build_object('type','direct_message','conversation_id',v_conversation,'sender_id',v_sender,'message_id',v_message_id,'href',v_href,'content_hidden',true),v_created_at);
  end if;
  return new;
exception when others then
  raise warning 'melo_direct_message_notification_v43 failed: %',sqlerrm;
  return new;
end;
$$;

-- Install on the direct chat table when present.
do $$
begin
  if to_regclass('public.chat_messages') is not null then
    execute 'drop trigger if exists melo_direct_message_notification_v43 on public.chat_messages';
    execute 'create trigger melo_direct_message_notification_v43 after insert on public.chat_messages for each row execute function public.melo_direct_message_notification_v43()';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- FREE PLAN READ GUARD
-- Only add a restrictive policy when the table already uses RLS. This avoids
-- changing legacy non-RLS deployments while hardening the normal Melo schema.
-- ---------------------------------------------------------------------------
do $$
declare v_table text;
begin
  if to_regprocedure('public.melo_has_entitlement_v25(text,uuid)') is null then return; end if;
  foreach v_table in array array['chat_messages','messages'] loop
    if to_regclass('public.'||v_table) is null then continue; end if;
    if exists(
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=v_table and c.relrowsecurity=true
    ) then
      execute format('drop policy if exists melo_chat_paid_read_v43 on public.%I',v_table);
      execute format(
        'create policy melo_chat_paid_read_v43 on public.%I as restrictive for select to authenticated using (public.melo_has_entitlement_v25(''can_chat'',auth.uid()))',
        v_table
      );
    end if;
  end loop;
end $$;

commit;
notify pgrst,'reload schema';
