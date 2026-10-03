-- Melo Chat Lite V47
-- Scope:
-- 1) Make source-backed User/Admin notifications create canonical public.notifications rows,
--    so the existing V45 dispatcher can deliver Web Push while the app/site is closed.
-- 2) Create canonical notifications for every Direct Chat message and both directions of Support Chat.
-- 3) Keep Free-plan direct chat Push content private (generic body only).
--
-- This migration intentionally does NOT replace V45. V45 remains the single
-- public.notifications -> send-web-push dispatcher.

begin;

-- ---------------------------------------------------------------------------
-- Common helpers
-- ---------------------------------------------------------------------------
create or replace function public.melo_try_uuid_v47(p_value text)
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

create or replace function public.melo_user_lang_v47(p_user uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare v text := 'en';
begin
  if p_user is null or to_regclass('public.profiles') is null then return v; end if;
  execute 'select coalesce(nullif(lower(primary_language),''''),''en'') from public.profiles where id=$1 limit 1'
    into v using p_user;
  v := split_part(replace(coalesce(v,'en'),'_','-'),'-',1);
  return case when v in ('th','de') then v else 'en' end;
exception when others then
  return 'en';
end;
$$;

create or replace function public.melo_insert_notification_once_v47(
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
begin
  if p_recipient is null or to_regclass('public.notifications') is null then return false; end if;

  if p_entity is not null and exists(
    select 1
    from public.notifications n
    where n.user_id = p_recipient
      and n.type = p_type
      and n.entity_id = p_entity
    limit 1
  ) then
    return true;
  end if;

  if to_regprocedure('public.melo_insert_notification_compat(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz)') is not null then
    return public.melo_insert_notification_compat(
      p_recipient,p_type,p_actor,p_entity,p_title,p_body,p_href,
      coalesce(p_metadata,'{}'::jsonb),coalesce(p_created_at,now())
    );
  end if;

  insert into public.notifications(user_id,type,actor_id,entity_id,title,body,href,is_read,metadata,created_at)
  values(
    p_recipient,
    coalesce(nullif(trim(p_type),''),'system'),
    p_actor,
    p_entity,
    p_title,
    p_body,
    p_href,
    false,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('href',p_href,'type',p_type),
    coalesce(p_created_at,now())
  );
  return true;
exception when others then
  raise warning 'melo_insert_notification_once_v47 failed: %',sqlerrm;
  return false;
end;
$$;

revoke all on function public.melo_insert_notification_once_v47(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz) from public;

-- ---------------------------------------------------------------------------
-- Direct Chat -> canonical notification -> V45 Web Push
-- ---------------------------------------------------------------------------
create or replace function public.melo_direct_recipient_v47(
  p_conversation text,
  p_sender uuid,
  p_message jsonb
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v uuid;
  v_table text;
  v_conv_col text;
  v_row jsonb;
  v_key text;
begin
  foreach v_key in array array[
    'recipient_id','recipient_user_id','receiver_id','receiver_user_id',
    'to_user_id','target_user_id','other_user_id','participant_user_id'
  ] loop
    v := public.melo_try_uuid_v47(p_message->>v_key);
    if v is not null and v <> p_sender then return v; end if;
  end loop;

  if nullif(trim(coalesce(p_conversation,'')),'') is null then return null; end if;

  foreach v_table in array array[
    'chat_conversation_members','conversation_members','chat_members','direct_chat_members'
  ] loop
    if to_regclass('public.'||v_table) is null then continue; end if;

    v_conv_col := null;
    select column_name into v_conv_col
    from information_schema.columns
    where table_schema='public' and table_name=v_table
      and column_name in ('conversation_id','chat_id','room_id')
    order by case column_name when 'conversation_id' then 1 when 'chat_id' then 2 else 3 end
    limit 1;
    if v_conv_col is null then continue; end if;

    for v_row in execute format(
      'select to_jsonb(m) from public.%I m where (to_jsonb(m)->>%L)=$1',
      v_table,v_conv_col
    ) using p_conversation loop
      foreach v_key in array array['user_id','member_user_id','member_id','participant_user_id','participant_id','profile_id'] loop
        v := public.melo_try_uuid_v47(v_row->>v_key);
        if v is not null and v <> p_sender then return v; end if;
      end loop;
    end loop;
  end loop;

  foreach v_table in array array[
    'chat_conversations','conversations','direct_conversations','direct_chats','chats'
  ] loop
    if to_regclass('public.'||v_table) is null then continue; end if;

    v_conv_col := null;
    select column_name into v_conv_col
    from information_schema.columns
    where table_schema='public' and table_name=v_table
      and column_name in ('id','conversation_id','chat_id','room_id')
    order by case column_name when 'id' then 1 when 'conversation_id' then 2 when 'chat_id' then 3 else 4 end
    limit 1;
    if v_conv_col is null then continue; end if;

    execute format(
      'select to_jsonb(c) from public.%I c where (to_jsonb(c)->>%L)=$1 limit 1',
      v_table,v_conv_col
    ) into v_row using p_conversation;

    if v_row is null then continue; end if;
    foreach v_key in array array[
      'user_id','other_user_id','user1_id','user2_id','user_1_id','user_2_id',
      'user_a_id','user_b_id','member_1_id','member_2_id','member_a_id','member_b_id',
      'participant_1_id','participant_2_id','participant_a_id','participant_b_id',
      'customer_user_id','partner_user_id','owner_user_id','sender_id','recipient_id'
    ] loop
      v := public.melo_try_uuid_v47(v_row->>v_key);
      if v is not null and v <> p_sender then return v; end if;
    end loop;
  end loop;

  if to_regclass('public.profile_matches') is not null then
    begin
      execute 'select case when user_a_id=$2 then user_b_id else user_a_id end from public.profile_matches where id::text=$1 and ($2=user_a_id or $2=user_b_id) limit 1'
        into v using p_conversation,p_sender;
      if v is not null and v <> p_sender then return v; end if;
    exception when others then null;
    end;
  end if;

  return null;
exception when others then
  raise warning 'melo_direct_recipient_v47: %',sqlerrm;
  return null;
end;
$$;

revoke all on function public.melo_direct_recipient_v47(text,uuid,jsonb) from public;

create or replace function public.melo_direct_message_notification_v47()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  j jsonb := to_jsonb(new);
  v_sender uuid;
  v_recipient uuid;
  v_message_id uuid;
  v_conversation text;
  v_sender_name text := 'Melo member';
  v_lang text := 'en';
  v_can_chat boolean := true;
  v_kind text := 'text';
  v_preview text;
  v_body text;
  v_href text;
  v_created_at timestamptz := now();
begin
  v_sender := coalesce(
    public.melo_try_uuid_v47(j->>'sender_id'),
    public.melo_try_uuid_v47(j->>'sender_user_id'),
    public.melo_try_uuid_v47(j->>'from_user_id'),
    public.melo_try_uuid_v47(j->>'author_id'),
    public.melo_try_uuid_v47(j->>'author_user_id'),
    public.melo_try_uuid_v47(j->>'user_id'),
    auth.uid()
  );
  if v_sender is null then return new; end if;

  v_conversation := coalesce(nullif(j->>'conversation_id',''),nullif(j->>'chat_id',''),nullif(j->>'room_id',''));
  v_recipient := public.melo_direct_recipient_v47(v_conversation,v_sender,j);
  if v_recipient is null or v_recipient=v_sender then return new; end if;

  v_message_id := public.melo_try_uuid_v47(j->>'id');
  begin v_created_at:=coalesce((j->>'created_at')::timestamptz,now()); exception when others then v_created_at:=now(); end;

  begin
    select coalesce(
      nullif(trim(concat_ws(' ',to_jsonb(p)->>'first_name',to_jsonb(p)->>'last_name')),''),
      nullif(to_jsonb(p)->>'display_name',''),
      nullif(u.raw_user_meta_data->>'full_name',''),
      split_part(u.email,'@',1),
      'Melo member'
    ) into v_sender_name
    from auth.users u
    left join public.profiles p on p.id=u.id
    where u.id=v_sender;
  exception when others then null;
  end;

  v_lang := public.melo_user_lang_v47(v_recipient);
  if to_regprocedure('public.melo_has_entitlement_v25(text,uuid)') is not null then
    begin v_can_chat := public.melo_has_entitlement_v25('can_chat',v_recipient); exception when others then v_can_chat:=true; end;
  end if;

  v_kind := lower(coalesce(nullif(j->>'message_type',''),'text'));
  v_preview := coalesce(
    nullif(j->>'original_text',''),nullif(j->>'content',''),nullif(j->>'message_text',''),
    nullif(j->>'message',''),nullif(j->>'body',''),nullif(j->>'text','')
  );

  if not v_can_chat then
    v_body := case v_lang when 'th' then 'มีข้อความใหม่' when 'de' then 'Du hast eine neue Nachricht.' else 'You have a new message.' end;
  elsif v_kind='image' then
    v_body := case v_lang when 'th' then '📷 ส่งรูปภาพ' when 'de' then '📷 Foto gesendet' else '📷 Sent a photo' end;
  elsif v_kind='sticker' then
    v_body := case v_lang when 'th' then 'ส่งสติ๊กเกอร์' when 'de' then 'Sticker gesendet' else 'Sent a sticker' end;
  else
    v_body := left(coalesce(v_preview,case v_lang when 'th' then 'มีข้อความใหม่' when 'de' then 'Neue Nachricht' else 'New message' end),180);
  end if;

  v_href := case
    when not v_can_chat then '/premium'
    when nullif(v_conversation,'') is not null then '/chat?type=direct&room='||v_conversation
    else '/chat'
  end;

  perform public.melo_insert_notification_once_v47(
    v_recipient,'direct_message',v_sender,v_message_id,
    coalesce(v_sender_name,'Melo member'),v_body,v_href,
    jsonb_build_object(
      'conversation_id',v_conversation,'actor_id',v_sender,'direct_chat',true,
      'chat_locked',not v_can_chat,'generic_only',not v_can_chat,'href',v_href
    ),v_created_at
  );
  return new;
exception when others then
  raise warning 'melo_direct_message_notification_v47: %',sqlerrm;
  return new;
end;
$$;

revoke all on function public.melo_direct_message_notification_v47() from public;

do $$
declare v_table text;
begin
  foreach v_table in array array['chat_messages','messages'] loop
    if to_regclass('public.'||v_table) is null then continue; end if;
    execute format('drop trigger if exists melo_direct_message_notification_v42_trg on public.%I',v_table);
    execute format('drop trigger if exists melo_direct_message_notification_v43 on public.%I',v_table);
    execute format('drop trigger if exists melo_direct_message_notification_v47_trg on public.%I',v_table);
    execute format('create trigger melo_direct_message_notification_v47_trg after insert on public.%I for each row execute function public.melo_direct_message_notification_v47()',v_table);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Support Chat in BOTH directions -> canonical notification -> V45 Web Push
-- ---------------------------------------------------------------------------
create or replace function public.melo_support_message_notification_v47()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_thread public.support_threads%rowtype;
  v_admin record;
  v_name text := 'Melo member';
  v_lang text;
  v_title text;
  v_body text;
begin
  select * into v_thread from public.support_threads where id=new.thread_id;
  if v_thread.id is null then return new; end if;

  if new.sender_role='member' then
    begin
      select coalesce(
        nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
        nullif(p.display_name,''),u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1),'Melo member'
      ) into v_name
      from auth.users u left join public.profiles p on p.id=u.id
      where u.id=v_thread.user_id;
    exception when others then null;
    end;

    for v_admin in
      select a.user_id
      from public.admin_users a
      where coalesce((to_jsonb(a)->>'is_active')::boolean,true)=true
        and (
          coalesce(to_jsonb(a)->>'role','') in ('admin','super_admin')
          or coalesce(to_jsonb(a)->'permissions'->>'support_chat_view','false')='true'
        )
    loop
      if v_admin.user_id = new.sender_id then continue; end if;
      v_lang := public.melo_user_lang_v47(v_admin.user_id);
      v_title := case v_lang when 'th' then 'มีข้อความ Support ใหม่' when 'de' then 'Neue Support-Nachricht' else 'New Support message' end;
      v_body := case v_lang when 'th' then coalesce(v_name,'Melo member')||' ส่งข้อความถึงทีมสนับสนุน' when 'de' then coalesce(v_name,'Melo member')||' hat den Support kontaktiert.' else coalesce(v_name,'Melo member')||' sent a message to Support.' end;
      perform public.melo_insert_notification_once_v47(
        v_admin.user_id,'support_message_admin',v_thread.user_id,new.id,
        v_title,v_body,'/admin?support_thread='||v_thread.id::text,
        jsonb_build_object('support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','admin_inbox','href','/admin?support_thread='||v_thread.id::text),
        new.created_at
      );
    end loop;

  elsif new.sender_role='admin' then
    v_lang := public.melo_user_lang_v47(v_thread.user_id);
    v_title := case v_lang when 'th' then 'มีการตอบกลับจาก Melo Chat Support' when 'de' then 'Antwort von Melo Chat Support' else 'Reply from Melo Chat Support' end;
    v_body := case v_lang when 'th' then 'ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน' when 'de' then 'Das Support-Team hat geantwortet. Tippe hier, um die Nachricht zu lesen.' else 'The support team replied to your message. Tap to read it.' end;
    perform public.melo_insert_notification_once_v47(
      v_thread.user_id,'support_message_user',new.sender_id,new.id,
      v_title,v_body,'/support/chat',
      jsonb_build_object('support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','member_support','href','/support/chat'),
      new.created_at
    );
  end if;

  return new;
exception when others then
  raise warning 'melo_support_message_notification_v47: %',sqlerrm;
  return new;
end;
$$;

drop trigger if exists support_messages_notification_trg on public.support_messages;
drop trigger if exists melo_support_message_notification_v47_trg on public.support_messages;
create trigger melo_support_message_notification_v47_trg
after insert on public.support_messages
for each row execute function public.melo_support_message_notification_v47();

-- ---------------------------------------------------------------------------
-- Verification request / decision -> canonical notifications for Admin + User
-- ---------------------------------------------------------------------------
create or replace function public.melo_verification_notifications_v47()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_admin record;
  v_lang text;
  v_title text;
  v_body text;
  v_new_submission boolean := false;
  v_decision boolean := false;
begin
  if TG_OP='INSERT' then
    v_new_submission := new.status='pending';
    v_decision := new.status in ('approved','rejected','more_info','needs_info');
  else
    v_new_submission := new.status='pending' and (
      old.status is distinct from new.status or old.submitted_at is distinct from new.submitted_at
    );
    v_decision := new.status in ('approved','rejected','more_info','needs_info') and old.status is distinct from new.status;
  end if;

  if v_new_submission then
    for v_admin in
      select a.user_id
      from public.admin_users a
      where coalesce((to_jsonb(a)->>'is_active')::boolean,true)=true
        and coalesce(to_jsonb(a)->>'role','') in ('admin','super_admin')
    loop
      v_lang := public.melo_user_lang_v47(v_admin.user_id);
      v_title := case v_lang when 'th' then 'มีคำขอยืนยันตัวตนใหม่' when 'de' then 'Neue Verifizierungsanfrage' else 'New verification request' end;
      v_body := case v_lang when 'th' then 'มีสมาชิกส่งเอกสารยืนยันตัวตน กรุณาตรวจสอบใน Admin Center' when 'de' then 'Ein Mitglied hat Verifizierungsdokumente eingereicht.' else 'A member submitted verification documents for review.' end;
      perform public.melo_insert_notification_once_v47(
        v_admin.user_id,'admin_verification_submitted',new.user_id,new.id,
        v_title,v_body,'/admin?tab=review',
        jsonb_build_object('admin_event',true,'verification_request_id',new.id,'href','/admin?tab=review'),
        coalesce(new.submitted_at,new.created_at,now())
      );
    end loop;
  end if;

  if v_decision then
    v_lang := public.melo_user_lang_v47(new.user_id);
    if new.status='approved' then
      v_title := case v_lang when 'th' then 'ยืนยันตัวตนสำเร็จ' when 'de' then 'Verifizierung genehmigt' else 'Verification approved' end;
      v_body := case v_lang when 'th' then 'Melo Chat อนุมัติเอกสารยืนยันตัวตนของคุณแล้ว' when 'de' then 'Melo Chat hat deine Verifizierungsdokumente genehmigt.' else 'Melo Chat approved your identity verification documents.' end;
    elsif new.status='rejected' then
      v_title := case v_lang when 'th' then 'เอกสารยืนยันตัวตนไม่ได้รับการอนุมัติ' when 'de' then 'Verifizierung abgelehnt' else 'Verification rejected' end;
      v_body := case v_lang when 'th' then 'กรุณาตรวจสอบสถานะและส่งเอกสารใหม่อีกครั้ง' when 'de' then 'Bitte prüfe die Entscheidung und reiche deine Dokumente erneut ein.' else 'Please review the decision and submit your documents again.' end;
    else
      v_title := case v_lang when 'th' then 'ต้องการข้อมูลยืนยันตัวตนเพิ่มเติม' when 'de' then 'Weitere Verifizierungsdaten erforderlich' else 'More verification information required' end;
      v_body := case v_lang when 'th' then 'กรุณาตรวจสอบข้อมูลหรือเอกสารที่แอดมินขอเพิ่มเติม' when 'de' then 'Bitte prüfe die zusätzlich angeforderten Informationen.' else 'Please review the additional information requested by admin.' end;
    end if;

    perform public.melo_insert_notification_once_v47(
      new.user_id,
      case new.status when 'approved' then 'verification_approved' when 'rejected' then 'verification_rejected' else 'verification_needs_info' end,
      new.reviewed_by,new.id,v_title,v_body,'/verify',
      jsonb_build_object('verification_request_id',new.id,'status',new.status,'href','/verify'),
      coalesce(new.reviewed_at,new.updated_at,now())
    );
  end if;

  return new;
exception when others then
  raise warning 'melo_verification_notifications_v47: %',sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_melo_admin_verification_notification on public.verification_requests;
drop trigger if exists trg_melo_user_verification_decision_notification on public.verification_requests;
drop trigger if exists melo_verification_notifications_v47_trg on public.verification_requests;
create trigger melo_verification_notifications_v47_trg
after insert or update of status,submitted_at on public.verification_requests
for each row execute function public.melo_verification_notifications_v47();

-- ---------------------------------------------------------------------------
-- User report submitted -> Admin push even outside Admin Center
-- ---------------------------------------------------------------------------
create or replace function public.melo_user_report_notification_v47()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_admin record; v_lang text; v_title text; v_body text;
begin
  for v_admin in
    select a.user_id
    from public.admin_users a
    where coalesce((to_jsonb(a)->>'is_active')::boolean,true)=true
      and coalesce(to_jsonb(a)->>'role','') in ('admin','super_admin')
  loop
    v_lang := public.melo_user_lang_v47(v_admin.user_id);
    v_title := case v_lang when 'th' then 'มีรายงานผู้ใช้ใหม่' when 'de' then 'Neue Nutzermeldung' else 'New user report' end;
    v_body := case v_lang when 'th' then 'มีรายงานผู้ใช้รอตรวจสอบใน Admin Center' when 'de' then 'Eine Nutzermeldung wartet im Admin Center auf Prüfung.' else 'A user report is waiting for review in Admin Center.' end;
    perform public.melo_insert_notification_once_v47(
      v_admin.user_id,'admin_user_report_submitted',new.reporter_user_id,new.id,
      v_title,v_body,'/admin?tab=reports',
      jsonb_build_object('admin_event',true,'report_id',new.id,'reported_user_id',new.reported_user_id,'href','/admin?tab=reports'),
      coalesce(new.created_at,now())
    );
  end loop;
  return new;
exception when others then
  raise warning 'melo_user_report_notification_v47: %',sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_melo_admin_user_report_notification on public.user_reports;
drop trigger if exists melo_user_report_notification_v47_trg on public.user_reports;
create trigger melo_user_report_notification_v47_trg
after insert on public.user_reports
for each row execute function public.melo_user_report_notification_v47();

-- ---------------------------------------------------------------------------
-- Admin warning/notice -> User push
-- ---------------------------------------------------------------------------
create or replace function public.melo_admin_user_notice_notification_v47()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_lang text; v_title text; v_body text;
begin
  v_lang := public.melo_user_lang_v47(new.user_id);
  v_title := coalesce(nullif(trim(new.subject),''),case v_lang when 'th' then 'ข้อความจาก Melo Chat' when 'de' then 'Nachricht von Melo Chat' else 'Message from Melo Chat' end);
  v_body := case v_lang when 'th' then 'คุณมีข้อความใหม่จากทีมงาน Melo Chat กดเพื่อดูรายละเอียด' when 'de' then 'Du hast eine neue Nachricht vom Melo-Chat-Team.' else 'You have a new message from the Melo Chat team.' end;
  perform public.melo_insert_notification_once_v47(
    new.user_id,'admin_user_notice',new.created_by,new.id,
    v_title,v_body,'/account',
    jsonb_build_object('admin_notice_id',new.id,'level',new.level,'report_id',new.report_id,'href','/account'),
    coalesce(new.created_at,now())
  );
  return new;
exception when others then
  raise warning 'melo_admin_user_notice_notification_v47: %',sqlerrm;
  return new;
end;
$$;

drop trigger if exists melo_admin_user_notice_notification_v47_trg on public.admin_user_notices;
create trigger melo_admin_user_notice_notification_v47_trg
after insert on public.admin_user_notices
for each row execute function public.melo_admin_user_notice_notification_v47();

commit;
notify pgrst,'reload schema';
