-- Melo Chat Lite V5
-- Reliable Admin Center activity notifications + Support reply notifications
-- + user verification decision notifications.
-- Reuses public.notifications and existing support/verification/report tables.

begin;

-- Compatibility inserter: only inserts columns that exist, allowing DB defaults
-- (especially notification primary-key defaults) to remain effective.
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
  v_cols text[] := array[]::text[];
  v_vals text[] := array[]::text[];
  v_has_recipient boolean := false;
  v_sql text;
  v_meta jsonb := coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('href',p_href,'type',p_type,'actor_id',p_actor,'entity_id',p_entity);
  c text;
begin
  if to_regclass('public.notifications') is null then return false; end if;

  foreach c in array array['user_id','recipient_id','recipient_user_id'] loop
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name=c) then
      v_cols := array_append(v_cols, quote_ident(c));
      v_vals := array_append(v_vals, '$1');
      v_has_recipient := true;
    end if;
  end loop;
  if not v_has_recipient then return false; end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='type') then v_cols:=array_append(v_cols,'type'); v_vals:=array_append(v_vals,'$2'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='notification_type') then v_cols:=array_append(v_cols,'notification_type'); v_vals:=array_append(v_vals,'$2'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='kind') then v_cols:=array_append(v_cols,'kind'); v_vals:=array_append(v_vals,'$2'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='actor_id') then v_cols:=array_append(v_cols,'actor_id'); v_vals:=array_append(v_vals,'$3'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='entity_id') then v_cols:=array_append(v_cols,'entity_id'); v_vals:=array_append(v_vals,'$4'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='title') then v_cols:=array_append(v_cols,'title'); v_vals:=array_append(v_vals,'$5'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='subject') then v_cols:=array_append(v_cols,'subject'); v_vals:=array_append(v_vals,'$5'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='body') then v_cols:=array_append(v_cols,'body'); v_vals:=array_append(v_vals,'$6'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='message') then v_cols:=array_append(v_cols,'message'); v_vals:=array_append(v_vals,'$6'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='href') then v_cols:=array_append(v_cols,'href'); v_vals:=array_append(v_vals,'$7'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='is_read') then v_cols:=array_append(v_cols,'is_read'); v_vals:=array_append(v_vals,'false'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='read') then v_cols:=array_append(v_cols,'read'); v_vals:=array_append(v_vals,'false'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='seen') then v_cols:=array_append(v_cols,'seen'); v_vals:=array_append(v_vals,'false'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='metadata') then v_cols:=array_append(v_cols,'metadata'); v_vals:=array_append(v_vals,'$8::jsonb'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='data') then v_cols:=array_append(v_cols,'data'); v_vals:=array_append(v_vals,'$8::jsonb'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='payload') then v_cols:=array_append(v_cols,'payload'); v_vals:=array_append(v_vals,'$8::jsonb'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='created_at') then v_cols:=array_append(v_cols,'created_at'); v_vals:=array_append(v_vals,'$9'); end if;

  v_sql := format('insert into public.notifications (%s) values (%s)', array_to_string(v_cols,','), array_to_string(v_vals,','));
  execute v_sql using p_recipient,p_type,p_actor,p_entity,p_title,p_body,p_href,v_meta,p_created_at;
  return true;
exception when others then
  raise warning 'melo_insert_notification_compat failed: %',sqlerrm;
  return false;
end;
$$;
revoke all on function public.melo_insert_notification_compat(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz) from public;

-- Admin activity: notify active admin accounts. The UI additionally derives
-- pending work directly from the existing queues so Admin Center still shows
-- actionable notifications even when upgrading from older notification schemas.
create or replace function public.melo_notify_admins_for_member_action()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare
  v_admin record; v_actor uuid; v_entity uuid; v_type text; v_title text; v_body text; v_href text; v_permission text;
begin
  if tg_table_name='verification_requests' then
    if coalesce(new.status,'')<>'pending' then return new; end if;
    if tg_op='UPDATE' and new.submitted_at is not distinct from old.submitted_at then return new; end if;
    v_actor:=new.user_id; v_entity:=new.id; v_type:='admin_verification_submitted';
    v_title:='มีคำขอยืนยันตัวตนใหม่'; v_body:='สมาชิกส่งเอกสารยืนยันตัวตนใหม่ กรุณาตรวจสอบใน Admin Center';
    v_href:='/admin?tab=review'; v_permission:='verification_view';
  elsif tg_table_name='user_reports' then
    v_actor:=new.reporter_user_id; v_entity:=new.id; v_type:='admin_user_report_submitted';
    v_title:='มีรายงานผู้ใช้ใหม่'; v_body:='สมาชิกส่งรายงานผู้ใช้ใหม่ กรุณาตรวจสอบใน Admin Center';
    v_href:='/admin?tab=reports'; v_permission:='user_reports_view';
  else return new; end if;

  for v_admin in
    select a.user_id from public.admin_users a
    where coalesce(a.is_active,true)=true
      and (a.role in ('admin','super_admin') or coalesce((a.permissions->>v_permission)::boolean,false))
  loop
    perform public.melo_insert_notification_compat(v_admin.user_id,v_type,v_actor,v_entity,v_title,v_body,v_href,
      jsonb_build_object('admin_event',true,'permission',v_permission),now());
  end loop;
  return new;
exception when others then raise warning 'Melo admin activity notification failed: %',sqlerrm; return new;
end;
$$;

drop trigger if exists trg_melo_admin_verification_notification on public.verification_requests;
create trigger trg_melo_admin_verification_notification after insert or update of submitted_at,status on public.verification_requests
for each row execute function public.melo_notify_admins_for_member_action();
drop trigger if exists trg_melo_admin_user_report_notification on public.user_reports;
create trigger trg_melo_admin_user_report_notification after insert on public.user_reports
for each row execute function public.melo_notify_admins_for_member_action();

-- User notification whenever admin changes verification decision.
create or replace function public.melo_notify_user_verification_decision()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_type text; v_title text; v_body text; v_href text := '/verify';
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status='approved' then
    v_type:='verification_approved'; v_title:='ยืนยันตัวตนสำเร็จ'; v_body:='Melo Chat อนุมัติเอกสารยืนยันตัวตนของคุณแล้ว';
  elsif new.status='rejected' then
    v_type:='verification_rejected'; v_title:='เอกสารยืนยันตัวตนไม่ได้รับการอนุมัติ'; v_body:=coalesce(nullif(new.reviewer_notes,''),'กรุณาตรวจสอบข้อมูลและส่งเอกสารใหม่อีกครั้ง');
  elsif new.status in ('more_info','needs_info') then
    v_type:='verification_needs_info'; v_title:='ต้องการข้อมูลยืนยันตัวตนเพิ่มเติม'; v_body:=coalesce(nullif(new.reviewer_notes,''),'กรุณาตรวจสอบข้อมูลหรือเอกสารที่ต้องส่งเพิ่มเติม');
  else return new; end if;
  perform public.melo_insert_notification_compat(new.user_id,v_type,new.reviewed_by,new.id,v_title,v_body,v_href,
    jsonb_build_object('verification_request_id',new.id,'verification_status',new.status,'admin_decision',true),coalesce(new.reviewed_at,now()));
  return new;
exception when others then raise warning 'Verification user notification failed: %',sqlerrm; return new;
end;
$$;
drop trigger if exists trg_melo_user_verification_decision_notification on public.verification_requests;
create trigger trg_melo_user_verification_decision_notification after update of status on public.verification_requests
for each row execute function public.melo_notify_user_verification_decision();

-- Support notification producer using the compatibility inserter instead of
-- jsonb_populate_record, so notification IDs/defaults are never nulled.
create or replace function public.support_message_notifications()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare
  v_thread public.support_threads%rowtype; v_admin record; v_name text;
begin
  select * into v_thread from public.support_threads where id=new.thread_id;
  if v_thread.id is null then return new; end if;

  if new.sender_role='member' then
    select coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),nullif(p.display_name,''),u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1),'Melo member')
      into v_name from auth.users u left join public.profiles p on p.id=u.id where u.id=v_thread.user_id;
    for v_admin in select a.user_id from public.admin_users a where coalesce(a.is_active,true)=true and (a.role in('admin','super_admin') or coalesce((a.permissions->>'support_chat_view')::boolean,false)) loop
      perform public.melo_insert_notification_compat(v_admin.user_id,'support_message_admin',v_thread.user_id,new.id,
        'ข้อความใหม่จาก Melo Chat Support',coalesce(v_name,'Melo member')||' ส่งข้อความถึงทีมสนับสนุน','/admin?support_thread='||v_thread.id::text,
        jsonb_build_object('support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','admin_inbox'),new.created_at);
    end loop;
  elsif new.sender_role='admin' then
    perform public.melo_insert_notification_compat(v_thread.user_id,'support_message_user',new.sender_id,new.id,
      'มีการตอบกลับจาก Melo Chat Support','ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน','/support/chat',
      jsonb_build_object('support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','member_support'),new.created_at);
  end if;
  return new;
exception when others then raise warning 'Support notification failed: %',sqlerrm; return new;
end;
$$;
drop trigger if exists support_messages_notification_trg on public.support_messages;
create trigger support_messages_notification_trg after insert on public.support_messages
for each row execute function public.support_message_notifications();

-- Backfill unread support replies so members can see an entry immediately after
-- applying this migration, without duplicating already-present support entries.
do $$
declare m record;
begin
  if to_regclass('public.notifications') is null then return; end if;
  for m in
    select sm.id,sm.sender_id,sm.thread_id,sm.created_at,st.user_id
    from public.support_messages sm join public.support_threads st on st.id=sm.thread_id
    where sm.sender_role='admin' and sm.read_at is null
    order by sm.created_at desc limit 100
  loop
    perform public.melo_insert_notification_compat(m.user_id,'support_message_user',m.sender_id,m.id,
      'มีการตอบกลับจาก Melo Chat Support','ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน','/support/chat',
      jsonb_build_object('support_thread_id',m.thread_id,'support_message_id',m.id,'support_context','member_support','backfill',true),m.created_at);
  end loop;
exception when others then raise warning 'Support notification backfill skipped: %',sqlerrm;
end $$;

commit;
