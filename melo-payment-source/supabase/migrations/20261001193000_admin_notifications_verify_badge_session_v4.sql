-- Melo Chat Lite V4
-- Fix Admin Center activity notifications for verification/report submissions.
-- Uses a compatibility insert so defaults (notably notification id) still apply.
-- Also keeps the existing verification/public badge RPC as the source of truth.

begin;

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

create or replace function public.melo_notify_admins_for_member_action()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_admin record;
  v_actor uuid;
  v_entity uuid;
  v_type text;
  v_title text;
  v_body text;
  v_href text;
  v_permission text;
begin
  if tg_table_name='verification_requests' then
    if coalesce(new.status,'')<>'pending' then return new; end if;
    if tg_op='UPDATE' and new.submitted_at is not distinct from old.submitted_at then return new; end if;
    v_actor:=new.user_id;
    v_entity:=new.id;
    v_type:='admin_verification_submitted';
    v_title:='มีคำขอยืนยันตัวตนใหม่';
    v_body:='สมาชิกส่งเอกสารยืนยันตัวตนใหม่ กรุณาตรวจสอบใน Admin Center';
    v_href:='/admin?tab=review';
    v_permission:='verification_view';
  elsif tg_table_name='user_reports' then
    v_actor:=new.reporter_user_id;
    v_entity:=new.id;
    v_type:='admin_user_report_submitted';
    v_title:='มีรายงานผู้ใช้ใหม่';
    v_body:='สมาชิกส่งรายงานผู้ใช้ใหม่ กรุณาตรวจสอบใน Admin Center';
    v_href:='/admin?tab=reports';
    v_permission:='user_reports_view';
  else
    return new;
  end if;

  for v_admin in
    select a.user_id from public.admin_users a
    where coalesce(a.is_active,true)=true
      and (a.role='super_admin' or coalesce((a.permissions->>v_permission)::boolean,false))
  loop
    perform public.melo_insert_notification_compat(
      v_admin.user_id,v_type,v_actor,v_entity,v_title,v_body,v_href,
      jsonb_build_object('admin_event',true,'permission',v_permission),now()
    );
  end loop;
  return new;
exception when others then
  raise warning 'Melo admin activity notification failed: %',sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_melo_admin_verification_notification on public.verification_requests;
create trigger trg_melo_admin_verification_notification
after insert or update of submitted_at,status on public.verification_requests
for each row execute function public.melo_notify_admins_for_member_action();

drop trigger if exists trg_melo_admin_user_report_notification on public.user_reports;
create trigger trg_melo_admin_user_report_notification
after insert on public.user_reports
for each row execute function public.melo_notify_admins_for_member_action();

-- Send one activity notification for currently pending work so Admin Center is
-- not empty immediately after upgrading from the older broken generic insert.
do $$
declare a record; v record;
begin
  if to_regclass('public.notifications') is null then return; end if;
  for a in select user_id,role,permissions from public.admin_users where coalesce(is_active,true)=true loop
    if a.role='super_admin' or coalesce((a.permissions->>'verification_view')::boolean,false) then
      for v in select id,user_id,submitted_at from public.verification_requests where status='pending' order by submitted_at desc limit 20 loop
        perform public.melo_insert_notification_compat(a.user_id,'admin_verification_submitted',v.user_id,v.id,'มีคำขอยืนยันตัวตนใหม่','สมาชิกส่งเอกสารยืนยันตัวตนใหม่ กรุณาตรวจสอบใน Admin Center','/admin?tab=review',jsonb_build_object('admin_event',true,'backfill',true),coalesce(v.submitted_at,now()));
      end loop;
    end if;
    if a.role='super_admin' or coalesce((a.permissions->>'user_reports_view')::boolean,false) then
      for v in select id,reporter_user_id,created_at from public.user_reports where coalesce(status,'new') in ('new','pending','open') order by created_at desc limit 20 loop
        perform public.melo_insert_notification_compat(a.user_id,'admin_user_report_submitted',v.reporter_user_id,v.id,'มีรายงานผู้ใช้ใหม่','สมาชิกส่งรายงานผู้ใช้ใหม่ กรุณาตรวจสอบใน Admin Center','/admin?tab=reports',jsonb_build_object('admin_event',true,'backfill',true),coalesce(v.created_at,now()));
      end loop;
    end if;
  end loop;
exception when others then
  raise warning 'Admin activity backfill skipped: %',sqlerrm;
end $$;

commit;
