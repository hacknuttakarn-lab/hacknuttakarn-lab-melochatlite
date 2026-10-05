-- Melo Chat Lite - Admin Center V1
create table if not exists public.subscription_plans(
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, price numeric(12,2) not null default 0,
 duration_days int not null default 30, boosts_per_month int not null default 0, translation_quota int not null default 0,
 features jsonb not null default '[]'::jsonb, is_active boolean not null default true, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.user_subscriptions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 plan_id uuid references public.subscription_plans(id), starts_at timestamptz not null default now(), expires_at timestamptz,
 status text not null default 'active', created_at timestamptz not null default now());
create table if not exists public.package_transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, plan_id uuid references public.subscription_plans(id),
 transaction_type text not null default 'purchase', amount numeric(12,2) not null default 0, currency text not null default 'THB',
 note text, created_at timestamptz not null default now());
create table if not exists public.user_reports(
 id uuid primary key default gen_random_uuid(), reporter_user_id uuid references auth.users(id) on delete set null,
 reported_user_id uuid references auth.users(id) on delete cascade, report_type text not null default 'behavior', reason text, details text,
 status text not null default 'new', created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references auth.users(id) on delete set null);
create table if not exists public.user_admin_status(
 user_id uuid primary key references auth.users(id) on delete cascade, is_suspended boolean not null default false,
 suspended_until timestamptz, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null);
insert into public.subscription_plans(code,name,price,duration_days,boosts_per_month,translation_quota,sort_order)
values ('free','Free',0,30,0,0,1),('premium','Premium',0,30,4,0,2),('premium_plus','Premium+',0,30,10,0,3)
on conflict(code) do nothing;

create or replace function public.is_admin_center_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true and a.role in ('admin','super_admin'));
$$;
revoke all on function public.is_admin_center_admin() from public; grant execute on function public.is_admin_center_admin() to authenticated;

create or replace function public.admin_center_list_users() returns table(user_id uuid,email text,full_name text,avatar_url text,plan_name text,plan_expires_at timestamptz,is_verified boolean,report_count bigint,is_suspended boolean)
language sql security definer set search_path=public,auth as $$
 select u.id,u.email,coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.display_name,u.raw_user_meta_data->>'full_name','Melo member'),
 coalesce(u.raw_user_meta_data->>'avatar_url', case when cardinality(p.photo_paths)>0 then p.photo_paths[1] else null end),coalesce(sp.name,'Free'),us.expires_at,
 public.get_public_identity_verification(u.id),(select count(*) from public.user_reports r where r.reported_user_id=u.id),coalesce(st.is_suspended,false)
 from auth.users u left join public.profiles p on p.id=u.id
 left join lateral (select * from public.user_subscriptions x where x.user_id=u.id and x.status='active' order by x.expires_at desc nulls last limit 1) us on true
 left join public.subscription_plans sp on sp.id=us.plan_id left join public.user_admin_status st on st.user_id=u.id
 where public.is_admin_center_admin() order by u.created_at desc;
$$;
grant execute on function public.admin_center_list_users() to authenticated;

create or replace function public.admin_center_list_reports() returns table(id uuid,reported_user_id uuid,reported_name text,reason text,details text,report_type text,status text,created_at timestamptz)
language sql security definer set search_path=public as $$ select r.id,r.reported_user_id,coalesce(p.display_name,nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Melo member'),r.reason,r.details,r.report_type,r.status,r.created_at from public.user_reports r left join public.profiles p on p.id=r.reported_user_id where public.is_admin_center_admin() order by r.created_at desc limit 500 $$;
grant execute on function public.admin_center_list_reports() to authenticated;

create or replace function public.admin_center_list_sales() returns table(id uuid,user_id uuid,email text,plan_code text,plan_name text,transaction_type text,amount numeric,created_at timestamptz)
language sql security definer set search_path=public,auth as $$ select t.id,t.user_id,u.email,p.code,p.name,t.transaction_type,t.amount,t.created_at from public.package_transactions t left join auth.users u on u.id=t.user_id left join public.subscription_plans p on p.id=t.plan_id where public.is_admin_center_admin() order by t.created_at desc limit 2000 $$;
grant execute on function public.admin_center_list_sales() to authenticated;

create or replace function public.admin_center_list_plans() returns setof public.subscription_plans language sql security definer set search_path=public as $$ select p.* from public.subscription_plans p where public.is_admin_center_admin() order by p.sort_order,p.price $$;
grant execute on function public.admin_center_list_plans() to authenticated;

create or replace function public.admin_center_save_plan(p_id uuid,p_code text,p_name text,p_price numeric,p_duration_days int,p_boosts int,p_translation_quota int,p_active boolean,p_features jsonb default '[]'::jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare v uuid; begin if not public.is_admin_center_admin() then raise exception 'admin only'; end if; if p_id is null then insert into public.subscription_plans(code,name,price,duration_days,boosts_per_month,translation_quota,is_active,features) values(lower(trim(p_code)),trim(p_name),p_price,p_duration_days,p_boosts,p_translation_quota,p_active,coalesce(p_features,'[]')) returning id into v; else update public.subscription_plans set code=lower(trim(p_code)),name=trim(p_name),price=p_price,duration_days=p_duration_days,boosts_per_month=p_boosts,translation_quota=p_translation_quota,is_active=p_active,features=coalesce(p_features,'[]'),updated_at=now() where id=p_id returning id into v; end if; return v; end $$;
grant execute on function public.admin_center_save_plan(uuid,text,text,numeric,int,int,int,boolean,jsonb) to authenticated;

create or replace function public.admin_center_user_action(p_user_id uuid,p_action text,p_days int default 30) returns boolean language plpgsql security definer set search_path=public,auth as $$ declare v_plan uuid; v_sub public.user_subscriptions%rowtype; begin if not public.is_admin_center_admin() then raise exception 'admin only'; end if; if p_user_id=auth.uid() and p_action='delete' then raise exception 'cannot delete your own admin account'; end if;
 if p_action='suspend' then insert into public.user_admin_status(user_id,is_suspended,suspended_until,updated_by) values(p_user_id,true,now()+make_interval(days=>greatest(1,p_days)),auth.uid()) on conflict(user_id) do update set is_suspended=true,suspended_until=excluded.suspended_until,updated_at=now(),updated_by=auth.uid();
 elsif p_action='renew' then select * into v_sub from public.user_subscriptions where user_id=p_user_id and status='active' order by expires_at desc nulls last limit 1; if v_sub.id is null then select id into v_plan from public.subscription_plans where code='free'; insert into public.user_subscriptions(user_id,plan_id,expires_at) values(p_user_id,v_plan,now()+make_interval(days=>greatest(1,p_days))); else update public.user_subscriptions set expires_at=greatest(coalesce(expires_at,now()),now())+make_interval(days=>greatest(1,p_days)) where id=v_sub.id; insert into public.package_transactions(user_id,plan_id,transaction_type,amount,note) values(p_user_id,v_sub.plan_id,'admin_renewal',0,'Admin extension'); end if;
 elsif p_action='delete' then delete from auth.users where id=p_user_id; else raise exception 'unknown action'; end if; return true; end $$;
grant execute on function public.admin_center_user_action(uuid,text,int) to authenticated;

alter table public.subscription_plans enable row level security; alter table public.user_subscriptions enable row level security; alter table public.package_transactions enable row level security; alter table public.user_reports enable row level security; alter table public.user_admin_status enable row level security;
drop policy if exists plans_public_read on public.subscription_plans; create policy plans_public_read on public.subscription_plans for select to authenticated using(is_active=true or public.is_admin_center_admin());
drop policy if exists own_subscription_read on public.user_subscriptions; create policy own_subscription_read on public.user_subscriptions for select to authenticated using(user_id=auth.uid() or public.is_admin_center_admin());
drop policy if exists own_report_insert on public.user_reports; create policy own_report_insert on public.user_reports for insert to authenticated with check(reporter_user_id=auth.uid());
drop policy if exists admin_report_read on public.user_reports; create policy admin_report_read on public.user_reports for select to authenticated using(public.is_admin_center_admin());
