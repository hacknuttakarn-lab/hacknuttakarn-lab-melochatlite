-- Melo Chat Lite - reversible suspend/delete + 90-day deletion queue + audit target email snapshot
create table if not exists public.user_deletion_requests(
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now(),
 delete_after timestamptz not null,
 requested_by uuid references auth.users(id) on delete set null,
 cancelled_at timestamptz,
 cancelled_by uuid references auth.users(id) on delete set null
);

alter table public.admin_audit_log add column if not exists target_email_snapshot text;
update public.admin_audit_log l set target_email_snapshot=u.email
from auth.users u where l.target_user_id=u.id and l.target_email_snapshot is null;

create or replace function public.admin_center_write_audit(p_action text,p_target uuid default null,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_email text;
begin
 if p_target is not null then select email into v_email from auth.users where id=p_target; end if;
 insert into public.admin_audit_log(actor_user_id,action,target_user_id,target_email_snapshot,details)
 values(auth.uid(),p_action,p_target,v_email,coalesce(p_details,'{}'::jsonb));
end $$;
revoke all on function public.admin_center_write_audit(text,uuid,jsonb) from public;

create or replace function public.admin_center_user_action(p_user_id uuid,p_action text,p_days int default 30)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
 if p_user_id=auth.uid() and p_action in ('delete','suspend') then raise exception 'cannot apply this action to your own admin account'; end if;
 if p_action='suspend' then
  if not public.admin_center_has_permission('users_suspend') then raise exception 'users_suspend permission required'; end if;
  insert into public.user_admin_status(user_id,is_suspended,suspended_until,updated_by) values(p_user_id,true,null,auth.uid())
  on conflict(user_id) do update set is_suspended=true,suspended_until=null,updated_at=now(),updated_by=auth.uid();
  perform public.admin_center_write_audit('user_suspended',p_user_id,jsonb_build_object('reversible',true));
 elsif p_action='reactivate' then
  if not public.admin_center_has_permission('users_suspend') then raise exception 'users_suspend permission required'; end if;
  insert into public.user_admin_status(user_id,is_suspended,suspended_until,updated_by) values(p_user_id,false,null,auth.uid())
  on conflict(user_id) do update set is_suspended=false,suspended_until=null,updated_at=now(),updated_by=auth.uid();
  perform public.admin_center_write_audit('user_reactivated',p_user_id,'{}'::jsonb);
 elsif p_action='delete' then
  if not public.admin_center_has_permission('users_delete') then raise exception 'users_delete permission required'; end if;
  if exists(select 1 from public.admin_users where user_id=p_user_id and role='super_admin') and not exists(select 1 from public.admin_users where user_id=auth.uid() and role='super_admin' and is_active=true) then raise exception 'Only Super Admin can delete Super Admin'; end if;
  insert into public.user_deletion_requests(user_id,requested_at,delete_after,requested_by,cancelled_at,cancelled_by)
  values(p_user_id,now(),now()+interval '90 days',auth.uid(),null,null)
  on conflict(user_id) do update set requested_at=now(),delete_after=now()+interval '90 days',requested_by=auth.uid(),cancelled_at=null,cancelled_by=null;
  perform public.admin_center_write_audit('user_delete_scheduled',p_user_id,jsonb_build_object('delete_after',now()+interval '90 days','waiting_days',90));
 elsif p_action='cancel_delete' then
  if not public.admin_center_has_permission('users_delete') then raise exception 'users_delete permission required'; end if;
  update public.user_deletion_requests set cancelled_at=now(),cancelled_by=auth.uid() where user_id=p_user_id and cancelled_at is null;
  perform public.admin_center_write_audit('user_delete_cancelled',p_user_id,'{}'::jsonb);
 else raise exception 'unknown action'; end if;
 return true;
end $$;
grant execute on function public.admin_center_user_action(uuid,text,int) to authenticated;

create or replace function public.admin_center_process_due_deletions()
returns integer language plpgsql security definer set search_path=public,auth as $$
declare r record; n int:=0;
begin
 for r in select d.user_id,u.email from public.user_deletion_requests d join auth.users u on u.id=d.user_id where d.cancelled_at is null and d.delete_after<=now() for update of d
 loop
  insert into public.admin_audit_log(actor_user_id,action,target_user_id,target_email_snapshot,details)
  values(null,'user_deleted',r.user_id,r.email,jsonb_build_object('reason','90-day waiting period completed'));
  delete from auth.users where id=r.user_id;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.admin_center_process_due_deletions() from public,anon,authenticated;

-- Preserve email in audit history even after auth.users is permanently deleted.
drop function if exists public.admin_center_list_audit();
create function public.admin_center_list_audit()
returns table(id uuid,actor_user_id uuid,actor_email text,action text,target_user_id uuid,target_email text,details jsonb,created_at timestamptz)
language sql security definer set search_path=public,auth as $$
 select l.id,l.actor_user_id,a.email,l.action,l.target_user_id,coalesce(l.target_email_snapshot,t.email),l.details,l.created_at
 from public.admin_audit_log l left join auth.users a on a.id=l.actor_user_id left join auth.users t on t.id=l.target_user_id
 where public.admin_center_has_permission('view_audit') order by l.created_at desc limit 2000;
$$;
grant execute on function public.admin_center_list_audit() to authenticated;

-- Add deletion state to Users.
drop function if exists public.admin_center_list_users();
create function public.admin_center_list_users()
returns table(user_id uuid,member_code text,email text,full_name text,avatar_url text,plan_id uuid,plan_name text,plan_expires_at timestamptz,is_verified boolean,report_count bigint,is_suspended boolean,admin_role text,admin_active boolean,admin_permissions jsonb,deletion_scheduled_at timestamptz)
language sql security definer set search_path=public,auth as $$
 select u.id,'ME'||lpad(m.member_number::text,6,'0'),u.email,
   coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.display_name,u.raw_user_meta_data->>'full_name','Melo member'),
   coalesce(case when cardinality(p.photo_paths)>0 then p.photo_paths[1] else null end,u.raw_user_meta_data->>'avatar_url'),
   us.plan_id,coalesce(sp.name,'Free'),us.expires_at,public.get_public_identity_verification(u.id),
   (select count(*) from public.user_reports r where r.reported_user_id=u.id),coalesce(st.is_suspended,false),
   au.role,au.is_active,coalesce(au.permissions,'{}'::jsonb),case when dr.cancelled_at is null then dr.delete_after else null end
 from auth.users u left join public.member_registry m on m.user_id=u.id left join public.profiles p on p.id=u.id
 left join lateral (select * from public.user_subscriptions x where x.user_id=u.id and x.status='active' order by x.expires_at desc nulls last,x.created_at desc limit 1) us on true
 left join public.subscription_plans sp on sp.id=us.plan_id left join public.user_admin_status st on st.user_id=u.id
 left join public.admin_users au on au.user_id=u.id left join public.user_deletion_requests dr on dr.user_id=u.id
 where public.admin_center_has_permission('users_view') or public.admin_center_has_permission('users_suspend') or public.admin_center_has_permission('users_delete') or public.admin_center_has_permission('package_assign') or public.admin_center_has_permission('manage_admins')
 order by u.created_at desc;
$$;
grant execute on function public.admin_center_list_users() to authenticated;

-- Add deletion state to User Reports.
drop function if exists public.admin_center_list_reports();
create function public.admin_center_list_reports()
returns table(id uuid,reported_user_id uuid,member_code text,reported_email text,reported_name text,reason text,details text,report_type text,status text,created_at timestamptz,admin_note text,report_count bigint,warning_count bigint,is_suspended boolean,deletion_scheduled_at timestamptz)
language sql security definer set search_path=public,auth as $$
 select r.id,r.reported_user_id,coalesce('ME'||lpad(mc.member_number::text,6,'0'),'—'),u.email,
   coalesce(p.display_name,nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Melo member'),r.reason,r.details,r.report_type,r.status,r.created_at,r.admin_note,
   (select count(*) from public.user_reports rr where rr.reported_user_id=r.reported_user_id),(select count(*) from public.admin_user_notices n where n.user_id=r.reported_user_id),
   coalesce(st.is_suspended,false),case when dr.cancelled_at is null then dr.delete_after else null end
 from public.user_reports r left join auth.users u on u.id=r.reported_user_id left join public.profiles p on p.id=r.reported_user_id
 left join public.member_registry mc on mc.user_id=r.reported_user_id left join public.user_admin_status st on st.user_id=r.reported_user_id
 left join public.user_deletion_requests dr on dr.user_id=r.reported_user_id
 where public.admin_center_has_permission('user_reports_view') order by r.created_at desc limit 500;
$$;
grant execute on function public.admin_center_list_reports() to authenticated;

-- Run permanent deletion hourly. Supabase includes pg_cron; this keeps the 90-day rule server-side.
create extension if not exists pg_cron;
do $$ begin
 if exists(select 1 from cron.job where jobname='melo_process_due_user_deletions') then perform cron.unschedule('melo_process_due_user_deletions'); end if;
 perform cron.schedule('melo_process_due_user_deletions','17 * * * *','select public.admin_center_process_due_deletions();');
end $$;
