-- Melo Chat Lite - Admin Permissions V1 + audit log
-- Granular server-side permissions. Existing admins are backfilled to keep their current access.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Preserve existing Admin Center behavior before granular enforcement.
update public.admin_users
set permissions = coalesce(permissions,'{}'::jsonb) || jsonb_build_object(
 'admin_center_access',true,
 'verification_view',true,'verification_action',true,
 'users_view',true,'users_suspend',true,'users_delete',true,
 'package_assign',true,'user_reports_view',true,
 'package_reports_view',true,'package_transactions_cancel',true,
 'package_manage',true,'manage_admins',true,'view_audit',true
)
where role='admin';

create or replace function public.admin_center_has_permission(p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.admin_users a
  where a.user_id=auth.uid() and a.is_active=true
    and (a.role='super_admin' or coalesce((a.permissions->>p_permission)::boolean,false)=true)
 );
$$;
revoke all on function public.admin_center_has_permission(text) from public;
grant execute on function public.admin_center_has_permission(text) to authenticated;

-- Verification now honors granular permissions; Super Admin always bypasses.
create or replace function public.is_melo_admin(p_permission text default null)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.admin_users a
  where a.user_id=auth.uid() and a.is_active=true and (
    a.role='super_admin' or
    (p_permission is null and a.role='admin') or
    (p_permission is not null and coalesce((a.permissions->>p_permission)::boolean,false)=true)
  )
 );
$$;

create or replace function public.admin_center_write_audit(p_action text,p_target uuid default null,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into public.admin_audit_log(actor_user_id,action,target_user_id,details)
 values(auth.uid(),p_action,p_target,coalesce(p_details,'{}'::jsonb));
end $$;
revoke all on function public.admin_center_write_audit(text,uuid,jsonb) from public;

-- Return admin metadata alongside user data. Drop is required because RETURNS TABLE changes.
drop function if exists public.admin_center_list_users();
create function public.admin_center_list_users()
returns table(user_id uuid,member_code text,email text,full_name text,avatar_url text,plan_id uuid,plan_name text,plan_expires_at timestamptz,is_verified boolean,report_count bigint,is_suspended boolean,admin_role text,admin_active boolean,admin_permissions jsonb)
language sql security definer set search_path=public,auth as $$
 select u.id,'ME'||lpad(m.member_number::text,6,'0'),u.email,
   coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.display_name,u.raw_user_meta_data->>'full_name','Melo member'),
   coalesce(case when cardinality(p.photo_paths)>0 then p.photo_paths[1] else null end,u.raw_user_meta_data->>'avatar_url'),
   us.plan_id,coalesce(sp.name,'Free'),us.expires_at,public.get_public_identity_verification(u.id),
   (select count(*) from public.user_reports r where r.reported_user_id=u.id),coalesce(st.is_suspended,false),
   au.role,au.is_active,coalesce(au.permissions,'{}'::jsonb)
 from auth.users u
 left join public.member_registry m on m.user_id=u.id
 left join public.profiles p on p.id=u.id
 left join lateral (select * from public.user_subscriptions x where x.user_id=u.id and x.status='active' order by x.expires_at desc nulls last,x.created_at desc limit 1) us on true
 left join public.subscription_plans sp on sp.id=us.plan_id
 left join public.user_admin_status st on st.user_id=u.id
 left join public.admin_users au on au.user_id=u.id
 where public.admin_center_has_permission('users_view') or public.admin_center_has_permission('users_suspend') or public.admin_center_has_permission('users_delete') or public.admin_center_has_permission('package_assign') or public.admin_center_has_permission('manage_admins')
 order by u.created_at desc;
$$;
grant execute on function public.admin_center_list_users() to authenticated;

create or replace function public.admin_center_save_admin_permissions(p_user_id uuid,p_role text,p_is_active boolean,p_permissions jsonb)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare actor_role text; target_role text;
begin
 select role into actor_role from public.admin_users where user_id=auth.uid() and is_active=true;
 if actor_role is null or not public.admin_center_has_permission('manage_admins') then raise exception 'manage_admins permission required'; end if;
 if p_user_id=auth.uid() then raise exception 'You cannot change your own admin role or permissions'; end if;
 select role into target_role from public.admin_users where user_id=p_user_id;
 if (p_role='super_admin' or target_role='super_admin') and actor_role<>'super_admin' then raise exception 'Only Super Admin can grant or modify Super Admin'; end if;
 if p_role not in ('user','reviewer','admin','super_admin') then raise exception 'invalid role'; end if;
 if p_role='user' then
   delete from public.admin_users where user_id=p_user_id;
 else
   insert into public.admin_users(user_id,role,is_active,permissions,updated_at)
   values(p_user_id,p_role,coalesce(p_is_active,true),coalesce(p_permissions,'{}'::jsonb),now())
   on conflict(user_id) do update set role=excluded.role,is_active=excluded.is_active,permissions=excluded.permissions,updated_at=now();
 end if;
 perform public.admin_center_write_audit('admin_permissions_changed',p_user_id,jsonb_build_object('role',p_role,'is_active',p_is_active,'permissions',coalesce(p_permissions,'{}'::jsonb)));
 return true;
end $$;
grant execute on function public.admin_center_save_admin_permissions(uuid,text,boolean,jsonb) to authenticated;

create or replace function public.admin_center_list_audit()
returns table(id uuid,actor_user_id uuid,actor_email text,action text,target_user_id uuid,target_email text,details jsonb,created_at timestamptz)
language sql security definer set search_path=public,auth as $$
 select l.id,l.actor_user_id,a.email,l.action,l.target_user_id,t.email,l.details,l.created_at
 from public.admin_audit_log l left join auth.users a on a.id=l.actor_user_id left join auth.users t on t.id=l.target_user_id
 where public.admin_center_has_permission('view_audit') order by l.created_at desc limit 2000;
$$;
grant execute on function public.admin_center_list_audit() to authenticated;

-- Enforce granular permissions on Admin Center mutations.
create or replace function public.admin_center_assign_plan(p_user_id uuid,p_plan_id uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_plan public.subscription_plans%rowtype;
begin
 if not public.admin_center_has_permission('package_assign') then raise exception 'package_assign permission required'; end if;
 select * into v_plan from public.subscription_plans where id=p_plan_id and is_active=true;
 if v_plan.id is null then raise exception 'package not found or inactive'; end if;
 update public.user_subscriptions set status='replaced' where user_id=p_user_id and status='active';
 insert into public.user_subscriptions(user_id,plan_id,starts_at,expires_at,status) values(p_user_id,v_plan.id,now(),now()+make_interval(days=>greatest(1,v_plan.duration_days)),'active');
 insert into public.package_transactions(user_id,plan_id,transaction_type,amount,note) values(p_user_id,v_plan.id,'admin_package_change',0,'Package assigned by admin');
 perform public.admin_center_write_audit('package_assigned',p_user_id,jsonb_build_object('plan_id',p_plan_id)); return true;
end $$;

create or replace function public.admin_center_user_action(p_user_id uuid,p_action text,p_days int default 30)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
 if p_user_id=auth.uid() and p_action='delete' then raise exception 'cannot delete your own admin account'; end if;
 if p_action='suspend' then
  if not public.admin_center_has_permission('users_suspend') then raise exception 'users_suspend permission required'; end if;
  insert into public.user_admin_status(user_id,is_suspended,suspended_until,updated_by) values(p_user_id,true,now()+make_interval(days=>greatest(1,p_days)),auth.uid()) on conflict(user_id) do update set is_suspended=true,suspended_until=excluded.suspended_until,updated_at=now(),updated_by=auth.uid();
  perform public.admin_center_write_audit('user_suspended',p_user_id,jsonb_build_object('days',p_days));
 elsif p_action='reactivate' then
  if not public.admin_center_has_permission('users_suspend') then raise exception 'users_suspend permission required'; end if;
  insert into public.user_admin_status(user_id,is_suspended,suspended_until,updated_by) values(p_user_id,false,null,auth.uid()) on conflict(user_id) do update set is_suspended=false,suspended_until=null,updated_at=now(),updated_by=auth.uid();
  perform public.admin_center_write_audit('user_reactivated',p_user_id,'{}'::jsonb);
 elsif p_action='delete' then
  if not public.admin_center_has_permission('users_delete') then raise exception 'users_delete permission required'; end if;
  if exists(select 1 from public.admin_users where user_id=p_user_id and role='super_admin') and not exists(select 1 from public.admin_users where user_id=auth.uid() and role='super_admin' and is_active=true) then raise exception 'Only Super Admin can delete Super Admin'; end if;
  perform public.admin_center_write_audit('user_deleted',p_user_id,'{}'::jsonb); delete from auth.users where id=p_user_id;
 else raise exception 'unknown action'; end if; return true;
end $$;

drop function if exists public.admin_center_list_reports();
create function public.admin_center_list_reports()
returns table(id uuid,reported_user_id uuid,reported_name text,reason text,details text,report_type text,status text,created_at timestamptz)
language sql security definer set search_path=public as $$
 select r.id,r.reported_user_id,coalesce(p.display_name,nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Melo member'),r.reason,r.details,r.report_type,r.status,r.created_at
 from public.user_reports r left join public.profiles p on p.id=r.reported_user_id
 where public.admin_center_has_permission('user_reports_view') order by r.created_at desc limit 500;
$$;
grant execute on function public.admin_center_list_reports() to authenticated;

drop function if exists public.admin_center_list_sales();
create function public.admin_center_list_sales()
returns table(id uuid,user_id uuid,email text,plan_code text,plan_name text,transaction_type text,amount numeric,status text,cancelled_at timestamptz,created_at timestamptz)
language sql security definer set search_path=public,auth as $$
 select t.id,t.user_id,u.email,p.code,p.name,t.transaction_type,t.amount,t.status,t.cancelled_at,t.created_at
 from public.package_transactions t left join auth.users u on u.id=t.user_id left join public.subscription_plans p on p.id=t.plan_id
 where public.admin_center_has_permission('package_reports_view') order by t.created_at desc limit 2000;
$$;
grant execute on function public.admin_center_list_sales() to authenticated;

create or replace function public.admin_center_cancel_transaction(p_transaction_id uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_status text; v_user uuid;
begin
 if not public.admin_center_has_permission('package_transactions_cancel') then raise exception 'package_transactions_cancel permission required'; end if;
 select status,user_id into v_status,v_user from public.package_transactions where id=p_transaction_id for update;
 if not found then raise exception 'transaction not found'; end if; if v_status='cancelled' then return true; end if;
 update public.package_transactions set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid(),note=concat_ws(' | ',nullif(note,''),'Cancelled by admin') where id=p_transaction_id;
 perform public.admin_center_write_audit('package_transaction_cancelled',v_user,jsonb_build_object('transaction_id',p_transaction_id)); return true;
end $$;

create or replace function public.admin_center_save_plan(p_id uuid,p_code text,p_name text,p_price numeric,p_duration_days int,p_boosts int,p_translation_quota int,p_active boolean,p_features jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v uuid;
begin
 if not public.admin_center_has_permission('package_manage') then raise exception 'package_manage permission required'; end if;
 if p_id is null then insert into public.subscription_plans(code,name,price,duration_days,boosts_per_month,translation_quota,is_active,features) values(lower(trim(p_code)),trim(p_name),p_price,p_duration_days,p_boosts,p_translation_quota,p_active,coalesce(p_features,'[]')) returning id into v;
 else update public.subscription_plans set code=lower(trim(p_code)),name=trim(p_name),price=p_price,duration_days=p_duration_days,boosts_per_month=p_boosts,translation_quota=p_translation_quota,is_active=p_active,features=coalesce(p_features,'[]'),updated_at=now() where id=p_id returning id into v; end if;
 perform public.admin_center_write_audit('package_saved',null,jsonb_build_object('plan_id',v,'code',p_code)); return v;
end $$;

-- Do not implicitly grant verification permissions in the access payload; the permission editor is the source of truth.
create or replace function public.get_my_admin_review_access()
returns table(user_id uuid,email text,role text,is_active boolean,permissions jsonb)
language sql stable security definer set search_path=public as $$
 select u.id,u.email,a.role,a.is_active,
   case when a.role='super_admin' then coalesce(a.permissions,'{}'::jsonb) || jsonb_build_object(
    'admin_center_access',true,'verification_view',true,'verification_action',true,'users_view',true,'users_suspend',true,'users_delete',true,
    'package_assign',true,'user_reports_view',true,'package_reports_view',true,'package_transactions_cancel',true,'package_manage',true,'manage_admins',true,'view_audit',true
   ) else coalesce(a.permissions,'{}'::jsonb) end
 from auth.users u join public.admin_users a on a.user_id=u.id where u.id=auth.uid();
$$;
