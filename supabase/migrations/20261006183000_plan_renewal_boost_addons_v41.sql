-- Melo Chat Lite V41 — safe plan renewal/queue + 90-day Boost Add-ons.
begin;

create table if not exists public.boost_addons (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  boost_type text not null check (boost_type in ('profile','post')), boost_count int not null check (boost_count>0),
  price numeric(12,2) not null check (price>0), credit_days int not null default 90 check (credit_days>0),
  is_active boolean not null default true, sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.boost_addons enable row level security;
drop policy if exists boost_addons_public_read on public.boost_addons;
create policy boost_addons_public_read on public.boost_addons for select to authenticated using (is_active=true);

insert into public.boost_addons(code,name,boost_type,boost_count,price,credit_days,sort_order) values
('profile_3','Profile Boost · 3','profile',3,79,90,10),('profile_10','Profile Boost · 10','profile',10,199,90,20),('profile_25','Profile Boost · 25','profile',25,399,90,30),
('post_3','Post Boost · 3','post',3,59,90,40),('post_10','Post Boost · 10','post',10,149,90,50),('post_25','Post Boost · 25','post',25,299,90,60)
on conflict(code) do update set name=excluded.name,boost_type=excluded.boost_type,boost_count=excluded.boost_count,price=excluded.price,credit_days=excluded.credit_days,sort_order=excluded.sort_order;

create table if not exists public.user_boost_addon_purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  addon_id uuid not null references public.boost_addons(id), boost_type text not null check (boost_type in ('profile','post')),
  credit_total int not null check (credit_total>0), credit_used int not null default 0 check (credit_used>=0),
  purchased_at timestamptz not null default now(), expires_at timestamptz not null, status text not null default 'active' check(status in ('active','used','expired')),
  stripe_session_id text unique, created_at timestamptz not null default now()
);
create index if not exists user_boost_addon_active_idx on public.user_boost_addon_purchases(user_id,boost_type,expires_at,purchased_at);
alter table public.user_boost_addon_purchases enable row level security;
drop policy if exists user_boost_addon_self_read on public.user_boost_addon_purchases;
create policy user_boost_addon_self_read on public.user_boost_addon_purchases for select to authenticated using(user_id=auth.uid());

create table if not exists public.stripe_boost_addon_fulfillments (
 id uuid primary key default gen_random_uuid(), stripe_event_id text not null unique, stripe_session_id text not null unique,
 stripe_environment text not null check(stripe_environment in ('sandbox','live')), user_id uuid not null references auth.users(id) on delete cascade,
 addon_id uuid not null references public.boost_addons(id), amount numeric(12,2) not null default 0, currency text not null default 'THB', fulfilled_at timestamptz not null default now()
);
alter table public.stripe_boost_addon_fulfillments enable row level security;

create or replace function public.melo_fulfill_stripe_boost_addon_v41(p_event_id text,p_session_id text,p_environment text,p_user_id uuid,p_addon_id uuid,p_amount numeric,p_currency text default 'THB') returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare v_addon public.boost_addons%rowtype; v_id uuid; v_fid uuid;
begin
 if auth.role()<>'service_role' then raise exception 'service role required'; end if;
 if p_environment not in ('sandbox','live') or p_user_id is null or p_addon_id is null then raise exception 'invalid boost checkout metadata'; end if;
 select * into v_addon from public.boost_addons where id=p_addon_id and is_active=true;
 if v_addon.id is null then raise exception 'boost add-on not found'; end if;
 insert into public.stripe_boost_addon_fulfillments(stripe_event_id,stripe_session_id,stripe_environment,user_id,addon_id,amount,currency)
 values(trim(p_event_id),trim(p_session_id),p_environment,p_user_id,p_addon_id,greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB')))
 on conflict do nothing returning id into v_fid;
 if v_fid is null then return jsonb_build_object('fulfilled',false,'duplicate',true,'session_id',p_session_id); end if;
 insert into public.user_boost_addon_purchases(user_id,addon_id,boost_type,credit_total,expires_at,stripe_session_id)
 values(p_user_id,v_addon.id,v_addon.boost_type,v_addon.boost_count,now()+make_interval(days=>v_addon.credit_days),p_session_id) returning id into v_id;
 return jsonb_build_object('fulfilled',true,'duplicate',false,'purchase_id',v_id,'boost_type',v_addon.boost_type,'credits',v_addon.boost_count);
end $$;
revoke all on function public.melo_fulfill_stripe_boost_addon_v41(text,text,text,uuid,uuid,numeric,text) from public;
grant execute on function public.melo_fulfill_stripe_boost_addon_v41(text,text,text,uuid,uuid,numeric,text) to service_role;

-- Same plan extends from the existing expiry. A different plan is scheduled after the current package.
create or replace function public.melo_fulfill_stripe_checkout_v39(p_event_id text,p_session_id text,p_environment text,p_user_id uuid,p_plan_id uuid,p_offer_id uuid,p_duration_months int,p_amount numeric,p_currency text default 'THB') returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare v_plan public.subscription_plans%rowtype; v_offer public.subscription_plan_offers%rowtype; v_fid uuid; v_current public.user_subscriptions%rowtype; v_tail public.user_subscriptions%rowtype; v_same public.user_subscriptions%rowtype; v_id uuid; v_start timestamptz; v_end timestamptz; v_months int;
begin
 if auth.role()<>'service_role' then raise exception 'service role required'; end if;
 if p_environment not in ('sandbox','live') or p_user_id is null or p_plan_id is null or p_offer_id is null then raise exception 'invalid checkout metadata'; end if;
 select * into v_plan from public.subscription_plans where id=p_plan_id;
 select * into v_offer from public.subscription_plan_offers where id=p_offer_id and plan_id=p_plan_id;
 v_months:=greatest(1,p_duration_months);
 if v_plan.id is null or v_plan.code='free' or v_offer.id is null or v_offer.duration_months<>v_months then raise exception 'invalid package offer'; end if;
 insert into public.stripe_checkout_fulfillments(stripe_event_id,stripe_session_id,stripe_environment,user_id,plan_id,offer_id,duration_months,amount,currency)
 values(trim(p_event_id),trim(p_session_id),p_environment,p_user_id,p_plan_id,p_offer_id,v_months,greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB')))
 on conflict do nothing returning id into v_fid;
 if v_fid is null then return jsonb_build_object('fulfilled',false,'duplicate',true,'session_id',p_session_id); end if;
 select * into v_current from public.user_subscriptions s where s.user_id=p_user_id and s.status='active' and s.starts_at<=now() and (s.expires_at is null or s.expires_at>now()) order by s.starts_at desc limit 1;
 select * into v_tail from public.user_subscriptions s where s.user_id=p_user_id and s.status='active' and (s.expires_at is null or s.expires_at>now()) order by s.expires_at desc nulls first limit 1;
 select * into v_same from public.user_subscriptions s where s.user_id=p_user_id and s.plan_id=p_plan_id and s.status='active' and (s.expires_at is null or s.expires_at>now()) order by s.expires_at desc nulls first limit 1;
 if v_same.id is not null and (v_tail.id is null or v_same.id=v_tail.id) then
   v_start:=greatest(now(),coalesce(v_same.expires_at,now())); v_end:=v_start+make_interval(months=>v_months);
   update public.user_subscriptions set expires_at=v_end,billing_period_months=coalesce(billing_period_months,0)+v_months where id=v_same.id returning id into v_id;
 else
   v_start:=case when v_tail.id is not null then coalesce(v_tail.expires_at,now()) when v_current.id is not null then coalesce(v_current.expires_at,now()) else now() end; v_end:=v_start+make_interval(months=>v_months);
   insert into public.user_subscriptions(user_id,plan_id,starts_at,billing_anchor,billing_period_months,expires_at,status) values(p_user_id,p_plan_id,v_start,v_start,v_months,v_end,'active') returning id into v_id;
 end if;
 insert into public.package_transactions(user_id,plan_id,transaction_type,amount,currency,note) values(p_user_id,p_plan_id,'stripe_purchase',greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB')),format('Stripe Checkout %s; offer %s; duration %s month(s); environment %s; starts %s',p_session_id,p_offer_id,v_months,p_environment,v_start));
 return jsonb_build_object('fulfilled',true,'duplicate',false,'subscription_id',v_id,'starts_at',v_start,'expires_at',v_end,'queued',v_start>now()+interval '5 seconds');
end $$;
revoke all on function public.melo_fulfill_stripe_checkout_v39(text,text,text,uuid,uuid,uuid,int,numeric,text) from public;
grant execute on function public.melo_fulfill_stripe_checkout_v39(text,text,text,uuid,uuid,uuid,int,numeric,text) to service_role;

-- Ensure future queued subscriptions never replace the currently-effective package early.
create or replace function public.melo_plan_context_v25(p_user_id uuid default auth.uid()) returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare v_uid uuid:=coalesce(p_user_id,auth.uid()); v_plan public.subscription_plans%rowtype; v_sub public.user_subscriptions%rowtype; v_anchor timestamptz; v_start timestamptz; v_end timestamptz; v_months int; v_addon_limit bigint:=0; v_addon_used bigint:=0;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if p_user_id is not null and p_user_id<>auth.uid() and not public.is_admin_center_admin() then raise exception 'Not permitted'; end if;
 select * into v_sub from public.user_subscriptions s where s.user_id=v_uid and s.status='active' and s.starts_at<=now() and (s.expires_at is null or s.expires_at>now()) order by s.starts_at desc limit 1;
 if v_sub.id is not null then select * into v_plan from public.subscription_plans where id=v_sub.plan_id; v_anchor:=coalesce(v_sub.billing_anchor,v_sub.starts_at); else select * into v_plan from public.subscription_plans where code='free' limit 1; select created_at into v_anchor from auth.users where id=v_uid; end if;
 if v_plan.id is null then raise exception 'Free plan is not configured'; end if;
 v_anchor:=coalesce(v_anchor,now()); v_months:=greatest(0,(date_part('year',age(now(),v_anchor))::int*12)+date_part('month',age(now(),v_anchor))::int); v_start:=v_anchor+make_interval(months=>v_months); if v_start>now() then v_start:=v_start-interval '1 month'; end if; v_end:=v_start+interval '1 month';
 select coalesce(sum(character_limit),0),coalesce(sum(character_used),0) into v_addon_limit,v_addon_used from public.user_translation_addons where user_id=v_uid and status='active' and cycle_start=v_start and cycle_end>=now();
 return jsonb_build_object('user_id',v_uid,'plan_id',v_plan.id,'plan_code',v_plan.code,'plan_name',v_plan.name,'subscription_start',v_sub.starts_at,'subscription_end',v_sub.expires_at,'billing_period_months',coalesce(v_sub.billing_period_months,1),'cycle_start',v_start,'cycle_end',v_end,'next_reset',v_end,'profile_post_limit',v_plan.profile_post_limit,'high_post_limit',v_plan.high_post_limit,'translation_limit',v_plan.translation_monthly_limit,'profile_boost_limit',v_plan.profile_boost_monthly_limit,'post_boost_limit',v_plan.post_boost_monthly_limit,'addon_translation_limit',v_addon_limit,'addon_translation_used',v_addon_used,'can_like',v_plan.can_like,'can_view_profiles',v_plan.can_view_profiles,'can_interested',v_plan.can_interested,'can_follow',v_plan.can_follow,'can_match',v_plan.can_match,'can_chat',v_plan.can_chat,'can_comment',v_plan.can_comment,'can_save_post',v_plan.can_save_post,'can_use_translation',v_plan.can_use_translation,'can_buy_translation_addon',v_plan.can_buy_translation_addon,'priority_support',v_plan.priority_support,'boost_priority',v_plan.boost_priority,'is_admin',public.is_admin_center_admin());
end $$;
revoke all on function public.melo_plan_context_v25(uuid) from public; grant execute on function public.melo_plan_context_v25(uuid) to authenticated;

-- Monthly boost quota is consumed first; after it is exhausted, the oldest unexpired add-on credit is consumed.
create or replace function public.melo_consume_quota_v25(p_kind text,p_amount int default 1,p_target_id uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb:=public.melo_get_my_plan_usage_v25(); v_uid uuid:=auth.uid(); v_start timestamptz:=(v->>'cycle_start')::timestamptz; v_limit int; v_used int; v_col text; v_remaining int:=p_amount; v_take int; r record; v_type text;
begin
 if p_amount<=0 then raise exception 'Invalid usage amount'; end if;
 if p_kind='profile_post' then v_limit:=nullif(v->>'profile_post_limit','')::int; v_used:=(v->>'profile_posts_used')::int; v_col:='profile_posts_used';
 elsif p_kind='profile_boost' then v_limit:=(v->>'profile_boost_limit')::int; v_used:=(v->>'profile_boost_used')::int; v_col:='profile_boost_used'; v_type:='profile';
 elsif p_kind='post_boost' then v_limit:=(v->>'post_boost_limit')::int; v_used:=(v->>'post_boost_used')::int; v_col:='post_boost_used'; v_type:='post'; else raise exception 'Unknown quota kind'; end if;
 if p_kind='profile_post' then if v_limit is not null and v_used+p_amount>v_limit then raise exception 'PLAN_QUOTA_EXCEEDED:%',p_kind; end if; update public.subscription_usage set profile_posts_used=profile_posts_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
 else
   v_take:=least(v_remaining,greatest(0,coalesce(v_limit,0)-coalesce(v_used,0)));
   if v_take>0 then if v_col='profile_boost_used' then update public.subscription_usage set profile_boost_used=profile_boost_used+v_take,updated_at=now() where user_id=v_uid and cycle_start=v_start; else update public.subscription_usage set post_boost_used=post_boost_used+v_take,updated_at=now() where user_id=v_uid and cycle_start=v_start; end if; v_remaining:=v_remaining-v_take; end if;
   for r in select id,credit_total,credit_used from public.user_boost_addon_purchases where user_id=v_uid and boost_type=v_type and status='active' and expires_at>now() and credit_used<credit_total order by expires_at asc,purchased_at asc for update loop
     exit when v_remaining<=0; v_take:=least(v_remaining,r.credit_total-r.credit_used); update public.user_boost_addon_purchases set credit_used=credit_used+v_take,status=case when credit_used+v_take>=credit_total then 'used' else status end where id=r.id; v_remaining:=v_remaining-v_take;
   end loop;
   if v_remaining>0 then raise exception 'PLAN_QUOTA_EXCEEDED:%',p_kind; end if;
   insert into public.boost_usage(user_id,boost_type,target_id,cycle_start) values(v_uid,v_type,p_target_id,v_start);
 end if;
 return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_consume_quota_v25(text,int,uuid) from public; grant execute on function public.melo_consume_quota_v25(text,int,uuid) to authenticated;

commit;
notify pgrst,'reload schema';
