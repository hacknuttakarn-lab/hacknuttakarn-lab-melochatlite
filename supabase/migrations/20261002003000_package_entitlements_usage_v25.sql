-- Melo Chat Lite V25 — packages, billing-month usage, translation add-ons and server-side entitlements.
-- Extends the existing subscription_plans/user_subscriptions system; does not create a parallel package system.
begin;

create extension if not exists pgcrypto;

alter table public.subscription_plans
  add column if not exists price_1_month numeric(12,2) not null default 0,
  add column if not exists price_3_months numeric(12,2) not null default 0,
  add column if not exists price_6_months numeric(12,2) not null default 0,
  add column if not exists profile_post_limit int,
  add column if not exists translation_monthly_limit int not null default 0,
  add column if not exists profile_boost_monthly_limit int not null default 0,
  add column if not exists post_boost_monthly_limit int not null default 0,
  add column if not exists can_like boolean not null default true,
  add column if not exists can_view_profiles boolean not null default false,
  add column if not exists can_interested boolean not null default false,
  add column if not exists can_follow boolean not null default false,
  add column if not exists can_match boolean not null default false,
  add column if not exists can_chat boolean not null default false,
  add column if not exists can_comment boolean not null default false,
  add column if not exists can_save_post boolean not null default false,
  add column if not exists can_use_translation boolean not null default false,
  add column if not exists can_buy_translation_addon boolean not null default false,
  add column if not exists priority_support boolean not null default false,
  add column if not exists boost_priority int not null default 0,
  add column if not exists high_post_limit boolean not null default false;

-- Keep legacy columns compatible with old screens while V25 screens use the explicit columns above.
update public.subscription_plans set
  price_1_month = case code when 'premium' then 399 when 'premium_plus' then 699 else 0 end,
  price_3_months = case code when 'premium' then 1099 when 'premium_plus' then 1899 else 0 end,
  price_6_months = case code when 'premium' then 1999 when 'premium_plus' then 3499 else 0 end,
  price = case code when 'premium' then 399 when 'premium_plus' then 699 else 0 end,
  profile_post_limit = case code when 'free' then 3 when 'premium' then 30 else null end,
  translation_monthly_limit = case code when 'premium' then 30000 when 'premium_plus' then 100000 else 0 end,
  translation_quota = case code when 'premium' then 30000 when 'premium_plus' then 100000 else 0 end,
  profile_boost_monthly_limit = case code when 'premium' then 4 when 'premium_plus' then 10 else 0 end,
  post_boost_monthly_limit = case code when 'premium' then 4 when 'premium_plus' then 10 else 0 end,
  boosts_per_month = case code when 'premium' then 4 when 'premium_plus' then 10 else 0 end,
  can_like = true,
  can_view_profiles = code in ('premium','premium_plus'),
  can_interested = code in ('premium','premium_plus'),
  can_follow = code in ('premium','premium_plus'),
  can_match = code in ('premium','premium_plus'),
  can_chat = code in ('premium','premium_plus'),
  can_comment = code in ('premium','premium_plus'),
  can_save_post = code in ('premium','premium_plus'),
  can_use_translation = code in ('premium','premium_plus'),
  can_buy_translation_addon = code in ('premium','premium_plus'),
  priority_support = code = 'premium_plus',
  boost_priority = case code when 'premium_plus' then 20 when 'premium' then 10 else 0 end,
  high_post_limit = code = 'premium_plus',
  updated_at = now()
where code in ('free','premium','premium_plus');

alter table public.user_subscriptions
  add column if not exists billing_period_months int not null default 1,
  add column if not exists billing_anchor timestamptz;
update public.user_subscriptions set billing_anchor=starts_at where billing_anchor is null;

create table if not exists public.subscription_usage(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_start timestamptz not null,
  cycle_end timestamptz not null,
  base_translation_used bigint not null default 0,
  addon_translation_used bigint not null default 0,
  profile_boost_used int not null default 0,
  post_boost_used int not null default 0,
  profile_posts_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,cycle_start)
);
create index if not exists subscription_usage_user_cycle_idx on public.subscription_usage(user_id,cycle_start desc);
alter table public.subscription_usage
  add column if not exists bonus_translation_limit bigint not null default 0,
  add column if not exists bonus_profile_boost_limit int not null default 0,
  add column if not exists bonus_post_boost_limit int not null default 0;


create table if not exists public.translation_addons(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  price numeric(12,2) not null,
  translation_characters int not null check(translation_characters>0),
  eligible_plans text[] not null default array['premium','premium_plus']::text[],
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.translation_addons(code,name,price,translation_characters,eligible_plans,sort_order)
values
 ('translate_mini','Translate Mini',129,50000,array['premium','premium_plus'],1),
 ('translate_plus','Translate Plus',299,150000,array['premium','premium_plus'],2),
 ('translate_max','Translate Max',549,300000,array['premium','premium_plus'],3)
on conflict(code) do update set name=excluded.name,price=excluded.price,translation_characters=excluded.translation_characters,eligible_plans=excluded.eligible_plans,sort_order=excluded.sort_order,updated_at=now();

create table if not exists public.user_translation_addons(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  addon_id uuid not null references public.translation_addons(id),
  cycle_start timestamptz not null,
  cycle_end timestamptz not null,
  character_limit int not null,
  character_used int not null default 0,
  status text not null default 'active',
  transaction_id uuid references public.package_transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists user_translation_addons_active_idx on public.user_translation_addons(user_id,cycle_end,status);

alter table public.profiles add column if not exists profile_boosted_at timestamptz;
alter table public.social_posts add column if not exists boosted_at timestamptz;
create table if not exists public.profile_boost_events(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boosted_at timestamptz not null default now()
);

create table if not exists public.boost_usage(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boost_type text not null check(boost_type in ('profile','post')),
  target_id uuid,
  cycle_start timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists boost_usage_user_cycle_idx on public.boost_usage(user_id,cycle_start,boost_type);

create table if not exists public.admin_usage_adjustments(
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.translation_cache(
  cache_key text primary key,
  original_text text not null,
  original_language text,
  translated_text text not null,
  translated_language text not null,
  translation_provider text not null default 'google',
  translation_character_count int not null,
  translated_at timestamptz not null default now()
);

alter table public.subscription_usage enable row level security;
alter table public.translation_addons enable row level security;
alter table public.user_translation_addons enable row level security;
alter table public.boost_usage enable row level security;
alter table public.admin_usage_adjustments enable row level security;
alter table public.translation_cache enable row level security;

drop policy if exists subscription_usage_own_read on public.subscription_usage;
create policy subscription_usage_own_read on public.subscription_usage for select to authenticated using(user_id=auth.uid() or public.is_admin_center_admin());
drop policy if exists translation_addons_read on public.translation_addons;
create policy translation_addons_read on public.translation_addons for select to authenticated using(is_active or public.is_admin_center_admin());
drop policy if exists user_translation_addons_own_read on public.user_translation_addons;
create policy user_translation_addons_own_read on public.user_translation_addons for select to authenticated using(user_id=auth.uid() or public.is_admin_center_admin());
drop policy if exists boost_usage_own_read on public.boost_usage;
create policy boost_usage_own_read on public.boost_usage for select to authenticated using(user_id=auth.uid() or public.is_admin_center_admin());
drop policy if exists admin_usage_adjustments_admin_read on public.admin_usage_adjustments;
create policy admin_usage_adjustments_admin_read on public.admin_usage_adjustments for select to authenticated using(public.is_admin_center_admin());

create or replace function public.melo_plan_context_v25(p_user_id uuid default auth.uid())
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare
 v_uid uuid:=coalesce(p_user_id,auth.uid()); v_plan public.subscription_plans%rowtype; v_sub public.user_subscriptions%rowtype;
 v_anchor timestamptz; v_start timestamptz; v_end timestamptz; v_months int; v_addon_limit bigint:=0; v_addon_used bigint:=0;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if p_user_id is not null and p_user_id<>auth.uid() and not public.is_admin_center_admin() then raise exception 'Not permitted'; end if;
 select * into v_sub from public.user_subscriptions s where s.user_id=v_uid and s.status='active' and (s.expires_at is null or s.expires_at>now()) order by s.starts_at desc limit 1;
 if v_sub.id is not null then
   select * into v_plan from public.subscription_plans where id=v_sub.plan_id;
   v_anchor:=coalesce(v_sub.billing_anchor,v_sub.starts_at);
 else
   select * into v_plan from public.subscription_plans where code='free' limit 1;
   select created_at into v_anchor from auth.users where id=v_uid;
 end if;
 if v_plan.id is null then raise exception 'Free plan is not configured'; end if;
 v_anchor:=coalesce(v_anchor,now());
 v_months:=greatest(0,(date_part('year',age(now(),v_anchor))::int*12)+date_part('month',age(now(),v_anchor))::int);
 v_start:=v_anchor+make_interval(months=>v_months);
 if v_start>now() then v_start:=v_start-interval '1 month'; end if;
 v_end:=v_start+interval '1 month';
 select coalesce(sum(character_limit),0),coalesce(sum(character_used),0) into v_addon_limit,v_addon_used from public.user_translation_addons where user_id=v_uid and status='active' and cycle_start=v_start and cycle_end>=now();
 return jsonb_build_object(
   'user_id',v_uid,'plan_id',v_plan.id,'plan_code',v_plan.code,'plan_name',v_plan.name,'subscription_start',v_sub.starts_at,'subscription_end',v_sub.expires_at,
   'billing_period_months',coalesce(v_sub.billing_period_months,1),'cycle_start',v_start,'cycle_end',v_end,'next_reset',v_end,
   'profile_post_limit',v_plan.profile_post_limit,'high_post_limit',v_plan.high_post_limit,'translation_limit',v_plan.translation_monthly_limit,
   'profile_boost_limit',v_plan.profile_boost_monthly_limit,'post_boost_limit',v_plan.post_boost_monthly_limit,
   'addon_translation_limit',v_addon_limit,'addon_translation_used',v_addon_used,
   'can_like',v_plan.can_like,'can_view_profiles',v_plan.can_view_profiles,'can_interested',v_plan.can_interested,'can_follow',v_plan.can_follow,'can_match',v_plan.can_match,'can_chat',v_plan.can_chat,'can_comment',v_plan.can_comment,'can_save_post',v_plan.can_save_post,'can_use_translation',v_plan.can_use_translation,'can_buy_translation_addon',v_plan.can_buy_translation_addon,'priority_support',v_plan.priority_support,'boost_priority',v_plan.boost_priority,
   'is_admin',public.is_admin_center_admin()
 );
end $$;
revoke all on function public.melo_plan_context_v25(uuid) from public; grant execute on function public.melo_plan_context_v25(uuid) to authenticated;

create or replace function public.melo_get_my_plan_usage_v25()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb:=public.melo_plan_context_v25(auth.uid()); v_uid uuid:=auth.uid(); v_start timestamptz:=(v->>'cycle_start')::timestamptz; v_end timestamptz:=(v->>'cycle_end')::timestamptz; v_usage public.subscription_usage%rowtype;
begin
 insert into public.subscription_usage(user_id,cycle_start,cycle_end) values(v_uid,v_start,v_end) on conflict(user_id,cycle_start) do update set cycle_end=excluded.cycle_end returning * into v_usage;
 return v || jsonb_build_object('base_translation_used',v_usage.base_translation_used,'addon_translation_used',v_usage.addon_translation_used,'profile_boost_used',v_usage.profile_boost_used,'post_boost_used',v_usage.post_boost_used,'profile_posts_used',v_usage.profile_posts_used,'bonus_translation_limit',v_usage.bonus_translation_limit,'bonus_profile_boost_limit',v_usage.bonus_profile_boost_limit,'bonus_post_boost_limit',v_usage.bonus_post_boost_limit,'profile_boost_limit',coalesce((v->>'profile_boost_limit')::int,0)+v_usage.bonus_profile_boost_limit,'post_boost_limit',coalesce((v->>'post_boost_limit')::int,0)+v_usage.bonus_post_boost_limit,'translation_total_limit',coalesce((v->>'translation_limit')::bigint,0)+coalesce((v->>'addon_translation_limit')::bigint,0)+v_usage.bonus_translation_limit,'translation_total_used',v_usage.base_translation_used+v_usage.addon_translation_used);
end $$;
revoke all on function public.melo_get_my_plan_usage_v25() from public; grant execute on function public.melo_get_my_plan_usage_v25() to authenticated;

create or replace function public.melo_has_entitlement_v25(p_key text,p_user_id uuid default auth.uid()) returns boolean language plpgsql stable security definer set search_path=public as $$
declare v jsonb:=public.melo_plan_context_v25(p_user_id); begin
 if coalesce((v->>'is_admin')::boolean,false) then return true; end if;
 return coalesce((v->>p_key)::boolean,false);
exception when others then return false; end $$;
revoke all on function public.melo_has_entitlement_v25(text,uuid) from public; grant execute on function public.melo_has_entitlement_v25(text,uuid) to authenticated;

create or replace function public.melo_consume_quota_v25(p_kind text,p_amount int default 1,p_target_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb:=public.melo_get_my_plan_usage_v25(); v_uid uuid:=auth.uid(); v_start timestamptz:=(v->>'cycle_start')::timestamptz; v_limit int; v_used int; v_col text;
begin
 if p_amount<=0 then raise exception 'Invalid usage amount'; end if;
 if p_kind='profile_post' then v_limit:=nullif(v->>'profile_post_limit','')::int; v_used:=(v->>'profile_posts_used')::int; v_col:='profile_posts_used';
 elsif p_kind='profile_boost' then v_limit:=(v->>'profile_boost_limit')::int; v_used:=(v->>'profile_boost_used')::int; v_col:='profile_boost_used';
 elsif p_kind='post_boost' then v_limit:=(v->>'post_boost_limit')::int; v_used:=(v->>'post_boost_used')::int; v_col:='post_boost_used';
 else raise exception 'Unknown quota kind'; end if;
 if v_limit is not null and v_used+p_amount>v_limit then raise exception 'PLAN_QUOTA_EXCEEDED:%',p_kind; end if;
 if v_col='profile_posts_used' then update public.subscription_usage set profile_posts_used=profile_posts_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
 elsif v_col='profile_boost_used' then update public.subscription_usage set profile_boost_used=profile_boost_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
 else update public.subscription_usage set post_boost_used=post_boost_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start; end if;
 if p_kind in ('profile_boost','post_boost') then insert into public.boost_usage(user_id,boost_type,target_id,cycle_start) values(v_uid,case when p_kind='profile_boost' then 'profile' else 'post' end,p_target_id,v_start); end if;
 return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_consume_quota_v25(text,int,uuid) from public; grant execute on function public.melo_consume_quota_v25(text,int,uuid) to authenticated;

create or replace function public.melo_translation_cache_key_v25(p_original text,p_target text) returns text language sql immutable as $$ select encode(digest(coalesce(p_original,'')||E'\x1f'||lower(coalesce(p_target,'')),'sha256'),'hex') $$;

create or replace function public.melo_get_cached_translation_v25(p_original text,p_target text)
returns table(translated_text text,original_language text,translation_character_count int) language sql security definer set search_path=public as $$
 select c.translated_text,c.original_language,c.translation_character_count from public.translation_cache c where c.cache_key=public.melo_translation_cache_key_v25(p_original,p_target) limit 1
$$;
revoke all on function public.melo_get_cached_translation_v25(text,text) from public; grant execute on function public.melo_get_cached_translation_v25(text,text) to authenticated;

create or replace function public.melo_record_translation_v25(p_original text,p_original_language text,p_translated text,p_target text,p_provider text default 'google')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb:=public.melo_get_my_plan_usage_v25(); v_uid uuid:=auth.uid(); v_start timestamptz:=(v->>'cycle_start')::timestamptz; v_chars int:=char_length(coalesce(p_translated,'')); v_base_limit bigint:=coalesce((v->>'translation_limit')::bigint,0); v_base_used bigint:=coalesce((v->>'base_translation_used')::bigint,0); v_add_limit bigint:=coalesce((v->>'addon_translation_limit')::bigint,0); v_add_used bigint:=coalesce((v->>'addon_translation_used')::bigint,0); v_take_base bigint; v_take_add bigint;
begin
 if not coalesce((v->>'is_admin')::boolean,false) and not coalesce((v->>'can_use_translation')::boolean,false) then raise exception 'PLAN_UPGRADE_REQUIRED:translation'; end if;
 if coalesce((v->>'is_admin')::boolean,false) then return v; end if;
 if v_chars<1 then return v; end if;
 if (v_base_limit-v_base_used)+(v_add_limit-v_add_used)<v_chars then raise exception 'PLAN_QUOTA_EXCEEDED:translation'; end if;
 v_take_base:=least(v_chars::bigint,greatest(0,v_base_limit-v_base_used)); v_take_add:=v_chars-v_take_base;
 update public.subscription_usage set base_translation_used=base_translation_used+v_take_base,addon_translation_used=addon_translation_used+v_take_add,updated_at=now() where user_id=v_uid and cycle_start=v_start;
 if v_take_add>0 then
   update public.user_translation_addons a set character_used=least(a.character_limit,a.character_used+v_take_add::int) where a.id=(select id from public.user_translation_addons where user_id=v_uid and status='active' and cycle_start=v_start and character_used<character_limit order by created_at limit 1);
 end if;
 insert into public.translation_cache(cache_key,original_text,original_language,translated_text,translated_language,translation_provider,translation_character_count) values(public.melo_translation_cache_key_v25(p_original,p_target),p_original,p_original_language,p_translated,lower(p_target),coalesce(p_provider,'google'),v_chars) on conflict(cache_key) do update set translated_text=excluded.translated_text,original_language=excluded.original_language,translation_provider=excluded.translation_provider,translation_character_count=excluded.translation_character_count,translated_at=now();
 return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_record_translation_v25(text,text,text,text,text) from public; grant execute on function public.melo_record_translation_v25(text,text,text,text,text) to authenticated;

create or replace function public.boost_my_profile() returns timestamptz language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_at timestamptz:=clock_timestamp(); begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if not public.melo_has_entitlement_v25('can_view_profiles',v_uid) then raise exception 'PLAN_UPGRADE_REQUIRED:profile_boost'; end if;
 perform public.melo_consume_quota_v25('profile_boost',1,v_uid);
 update public.profiles set profile_boosted_at=v_at,updated_at=now() where id=v_uid; if not found then raise exception 'Profile not found'; end if;
 insert into public.profile_boost_events(user_id,boosted_at) values(v_uid,v_at); return v_at; end $$;

create or replace function public.boost_social_post(p_post_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.social_posts where id=p_post_id and author_id=auth.uid()) then raise exception 'Post not found or not permitted'; end if;
 perform public.melo_consume_quota_v25('post_boost',1,p_post_id);
 update public.social_posts set boosted_at=now() where id=p_post_id and author_id=auth.uid(); return true; end $$;

-- Enforce Free/Premium actions at RPC level.
create or replace function public.set_profile_follow(p_target_user_id uuid,p_following boolean) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); begin
 if v_uid is null then raise exception 'Authentication required'; end if; if p_target_user_id is null or p_target_user_id=v_uid then raise exception 'Invalid target user'; end if;
 if p_following and not public.melo_has_entitlement_v25('can_follow',v_uid) then raise exception 'PLAN_UPGRADE_REQUIRED:follow'; end if;
 if p_following then insert into public.profile_follows(follower_id,followed_user_id) values(v_uid,p_target_user_id) on conflict do nothing; else delete from public.profile_follows where follower_id=v_uid and followed_user_id=p_target_user_id; end if; return p_following; end $$;

create or replace function public.set_profile_like(p_target_user_id uuid,p_liked boolean) returns table(is_match boolean,match_id uuid) language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_a uuid;v_b uuid;v_match_id uuid; begin
 if v_uid is null then raise exception 'Authentication required'; end if; if p_target_user_id is null or p_target_user_id=v_uid then raise exception 'Invalid target user'; end if;
 if p_liked and not public.melo_has_entitlement_v25('can_interested',v_uid) then raise exception 'PLAN_UPGRADE_REQUIRED:interested'; end if;
 if p_liked then delete from public.profile_passes where owner_id=v_uid and passed_user_id=p_target_user_id; insert into public.profile_likes(liker_id,liked_user_id) values(v_uid,p_target_user_id) on conflict do nothing;
   if exists(select 1 from public.profile_likes where liker_id=p_target_user_id and liked_user_id=v_uid) then
     if not public.melo_has_entitlement_v25('can_match',v_uid) then return query select false,null::uuid; return; end if;
     v_a:=least(v_uid,p_target_user_id);v_b:=greatest(v_uid,p_target_user_id); perform pg_advisory_xact_lock(hashtextextended(v_a::text||':'||v_b::text,0));
     select id into v_match_id from public.profile_matches where (user_a_id=v_a and user_b_id=v_b) or (user_a_id=v_b and user_b_id=v_a) order by matched_at asc limit 1;
     if v_match_id is null then insert into public.profile_matches(user_a_id,user_b_id) values(v_a,v_b) returning id into v_match_id; end if; return query select true,v_match_id;return; end if;
 else delete from public.profile_likes where liker_id=v_uid and liked_user_id=p_target_user_id; end if; return query select false,null::uuid; end $$;

-- Preserve the existing social-post signature and count posts against the current billing month.
create or replace function public.create_social_post(p_body text,p_visibility text,p_image_paths text[],p_location_name text,p_latitude double precision,p_longitude double precision,p_activity_type text,p_activity_id uuid,p_activity_title text,p_activity_subtitle text,p_activity_image_path text,p_audience_user_ids uuid[])
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if; perform public.melo_consume_quota_v25('profile_post',1,null);
 insert into public.social_posts(author_id,body,visibility,image_paths,location_name,latitude,longitude,activity_type,activity_id,activity_title,activity_subtitle,activity_image_path,audience_user_ids) values(auth.uid(),coalesce(p_body,''),coalesce(p_visibility,'public'),coalesce(p_image_paths,'{}'),p_location_name,p_latitude,p_longitude,p_activity_type,p_activity_id,p_activity_title,p_activity_subtitle,p_activity_image_path,coalesce(p_audience_user_ids,'{}')) returning id into v_id; return v_id; end $$;

create or replace function public.create_social_post_comment(p_post_id uuid,p_body text,p_parent_comment_id uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if; if not public.melo_has_entitlement_v25('can_comment',auth.uid()) then raise exception 'PLAN_UPGRADE_REQUIRED:comment'; end if; if nullif(trim(coalesce(p_body,'')),'') is null then raise exception 'Comment is empty'; end if; if not exists(select 1 from public.social_posts where id=p_post_id) then raise exception 'Post not found'; end if;
 insert into public.social_post_comments(post_id,author_id,parent_comment_id,body) values(p_post_id,auth.uid(),p_parent_comment_id,trim(p_body)) returning id into v_id; return v_id; end $$;

create or replace function public.toggle_social_post_save(p_post_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); begin
 if v_uid is null then raise exception 'Authentication required'; end if; if not public.melo_has_entitlement_v25('can_save_post',v_uid) then raise exception 'PLAN_UPGRADE_REQUIRED:save_post'; end if; if not exists(select 1 from public.social_posts where id=p_post_id) then raise exception 'Post not found'; end if;
 if exists(select 1 from public.social_post_saves where post_id=p_post_id and user_id=v_uid) then delete from public.social_post_saves where post_id=p_post_id and user_id=v_uid; return false; end if; insert into public.social_post_saves(post_id,user_id) values(p_post_id,v_uid) on conflict do nothing; return true; end $$;

create or replace function public.admin_center_save_plan_v25(p_id uuid,p_code text,p_name text,p_price_1 numeric,p_price_3 numeric,p_price_6 numeric,p_profile_post_limit int,p_translation_limit int,p_profile_boost_limit int,p_post_boost_limit int,p_can_view_profiles boolean,p_can_interested boolean,p_can_follow boolean,p_can_match boolean,p_can_chat boolean,p_can_comment boolean,p_can_save_post boolean,p_can_use_translation boolean,p_priority_support boolean,p_boost_priority int,p_high_post_limit boolean,p_active boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare v uuid; begin if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
 if p_id is null then insert into public.subscription_plans(code,name,price,price_1_month,price_3_months,price_6_months,duration_days,profile_post_limit,translation_monthly_limit,translation_quota,profile_boost_monthly_limit,post_boost_monthly_limit,boosts_per_month,can_view_profiles,can_interested,can_follow,can_match,can_chat,can_comment,can_save_post,can_use_translation,can_buy_translation_addon,priority_support,boost_priority,high_post_limit,is_active) values(lower(trim(p_code)),trim(p_name),p_price_1,p_price_1,p_price_3,p_price_6,30,p_profile_post_limit,p_translation_limit,p_translation_limit,p_profile_boost_limit,p_post_boost_limit,p_profile_boost_limit,p_can_view_profiles,p_can_interested,p_can_follow,p_can_match,p_can_chat,p_can_comment,p_can_save_post,p_can_use_translation,p_can_use_translation,p_priority_support,p_boost_priority,p_high_post_limit,p_active) returning id into v;
 else update public.subscription_plans set code=lower(trim(p_code)),name=trim(p_name),price=p_price_1,price_1_month=p_price_1,price_3_months=p_price_3,price_6_months=p_price_6,profile_post_limit=p_profile_post_limit,translation_monthly_limit=p_translation_limit,translation_quota=p_translation_limit,profile_boost_monthly_limit=p_profile_boost_limit,post_boost_monthly_limit=p_post_boost_limit,boosts_per_month=p_profile_boost_limit,can_view_profiles=p_can_view_profiles,can_interested=p_can_interested,can_follow=p_can_follow,can_match=p_can_match,can_chat=p_can_chat,can_comment=p_can_comment,can_save_post=p_can_save_post,can_use_translation=p_can_use_translation,can_buy_translation_addon=p_can_use_translation,priority_support=p_priority_support,boost_priority=p_boost_priority,high_post_limit=p_high_post_limit,is_active=p_active,updated_at=now() where id=p_id returning id into v; end if; perform public.admin_center_write_audit('package_saved',null,jsonb_build_object('plan_id',v,'code',p_code)); return v; end $$;
revoke all on function public.admin_center_save_plan_v25(uuid,text,text,numeric,numeric,numeric,int,int,int,int,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,int,boolean,boolean) from public; grant execute on function public.admin_center_save_plan_v25(uuid,text,text,numeric,numeric,numeric,int,int,int,int,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,int,boolean,boolean) to authenticated;

create or replace function public.admin_center_assign_plan_v25(p_user_id uuid,p_plan_id uuid,p_billing_months int default 1) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_plan public.subscription_plans%rowtype; v_months int:=case when p_billing_months in (1,3,6) then p_billing_months else 1 end; v_amount numeric; begin
 if not public.is_admin_center_admin() then raise exception 'admin only'; end if; select * into v_plan from public.subscription_plans where id=p_plan_id and is_active=true; if v_plan.id is null then raise exception 'package not found or inactive'; end if;
 v_amount:=case v_months when 3 then v_plan.price_3_months when 6 then v_plan.price_6_months else v_plan.price_1_month end;
 update public.user_subscriptions set status='replaced' where user_id=p_user_id and status='active'; insert into public.user_subscriptions(user_id,plan_id,starts_at,billing_anchor,billing_period_months,expires_at,status) values(p_user_id,v_plan.id,now(),now(),v_months,now()+make_interval(months=>v_months),'active');
 insert into public.package_transactions(user_id,plan_id,transaction_type,amount,note) values(p_user_id,v_plan.id,'admin_package_change',0,format('Assigned by admin for %s month(s); listed price %s THB',v_months,v_amount)); perform public.admin_center_write_audit('package_assigned',p_user_id,jsonb_build_object('plan_id',p_plan_id,'billing_months',v_months,'listed_price',v_amount)); return true; end $$;
revoke all on function public.admin_center_assign_plan_v25(uuid,uuid,int) from public; grant execute on function public.admin_center_assign_plan_v25(uuid,uuid,int) to authenticated;

create or replace function public.admin_center_list_translation_addons_v25() returns setof public.translation_addons language sql security definer set search_path=public as $$ select a.* from public.translation_addons a where public.is_admin_center_admin() order by sort_order,price $$;
revoke all on function public.admin_center_list_translation_addons_v25() from public; grant execute on function public.admin_center_list_translation_addons_v25() to authenticated;

create or replace function public.admin_center_save_translation_addon_v25(p_id uuid,p_code text,p_name text,p_price numeric,p_characters int,p_active boolean,p_eligible text[] default array['premium','premium_plus']::text[]) returns uuid language plpgsql security definer set search_path=public as $$
declare v uuid; begin if not public.is_admin_center_admin() then raise exception 'admin only'; end if; if p_id is null then insert into public.translation_addons(code,name,price,translation_characters,is_active,eligible_plans) values(lower(trim(p_code)),trim(p_name),p_price,p_characters,p_active,p_eligible) returning id into v; else update public.translation_addons set code=lower(trim(p_code)),name=trim(p_name),price=p_price,translation_characters=p_characters,is_active=p_active,eligible_plans=p_eligible,updated_at=now() where id=p_id returning id into v; end if; perform public.admin_center_write_audit('translation_addon_saved',null,jsonb_build_object('addon_id',v,'code',p_code)); return v; end $$;
revoke all on function public.admin_center_save_translation_addon_v25(uuid,text,text,numeric,int,boolean,text[]) from public; grant execute on function public.admin_center_save_translation_addon_v25(uuid,text,text,numeric,int,boolean,text[]) to authenticated;

create or replace function public.admin_center_get_member_usage_v25(p_user_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin if not public.is_admin_center_admin() then raise exception 'admin only'; end if; return public.melo_plan_context_v25(p_user_id) || coalesce((select to_jsonb(u) from public.subscription_usage u where u.user_id=p_user_id and u.cycle_start=(public.melo_plan_context_v25(p_user_id)->>'cycle_start')::timestamptz limit 1),'{}'::jsonb); end $$;
revoke all on function public.admin_center_get_member_usage_v25(uuid) from public; grant execute on function public.admin_center_get_member_usage_v25(uuid) to authenticated;





create or replace function public.admin_center_adjust_usage_v25(p_user_id uuid,p_action text,p_amount int default 0,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ctx jsonb; v_start timestamptz; v_old jsonb; v_new jsonb;
begin
 if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
 if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'reason required'; end if;
 v_ctx:=public.melo_plan_context_v25(p_user_id); v_start:=(v_ctx->>'cycle_start')::timestamptz;
 insert into public.subscription_usage(user_id,cycle_start,cycle_end) values(p_user_id,v_start,(v_ctx->>'cycle_end')::timestamptz) on conflict(user_id,cycle_start) do nothing;
 select to_jsonb(u) into v_old from public.subscription_usage u where u.user_id=p_user_id and u.cycle_start=v_start;
 if p_action='reset_usage' then
   update public.subscription_usage set base_translation_used=0,addon_translation_used=0,profile_boost_used=0,post_boost_used=0,profile_posts_used=0,updated_at=now() where user_id=p_user_id and cycle_start=v_start;
 elsif p_action='add_translation' then
   update public.subscription_usage set bonus_translation_limit=bonus_translation_limit+greatest(0,p_amount),updated_at=now() where user_id=p_user_id and cycle_start=v_start;
 elsif p_action='add_profile_boost' then
   update public.subscription_usage set bonus_profile_boost_limit=bonus_profile_boost_limit+greatest(0,p_amount),updated_at=now() where user_id=p_user_id and cycle_start=v_start;
 elsif p_action='add_post_boost' then
   update public.subscription_usage set bonus_post_boost_limit=bonus_post_boost_limit+greatest(0,p_amount),updated_at=now() where user_id=p_user_id and cycle_start=v_start;
 else raise exception 'unknown adjustment'; end if;
 select to_jsonb(u) into v_new from public.subscription_usage u where u.user_id=p_user_id and u.cycle_start=v_start;
 insert into public.admin_usage_adjustments(admin_id,user_id,action,old_value,new_value,reason) values(auth.uid(),p_user_id,p_action,v_old,v_new,trim(p_reason));
 perform public.admin_center_write_audit('usage_'||p_action,p_user_id,jsonb_build_object('amount',p_amount,'reason',trim(p_reason),'old_value',v_old,'new_value',v_new));
 return v_new;
end $$;
revoke all on function public.admin_center_adjust_usage_v25(uuid,text,int,text) from public;
grant execute on function public.admin_center_adjust_usage_v25(uuid,text,int,text) to authenticated;

create or replace function public.admin_center_assign_translation_addon_v25(p_user_id uuid,p_addon_id uuid,p_reason text default 'Admin assignment')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_ctx jsonb; v_addon public.translation_addons%rowtype; v_id uuid;
begin
 if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
 select * into v_addon from public.translation_addons where id=p_addon_id and is_active=true; if v_addon.id is null then raise exception 'add-on not found'; end if;
 v_ctx:=public.melo_plan_context_v25(p_user_id);
 if not ((v_ctx->>'plan_code')=any(v_addon.eligible_plans)) then raise exception 'plan not eligible for add-on'; end if;
 insert into public.user_translation_addons(user_id,addon_id,cycle_start,cycle_end,character_limit,status) values(p_user_id,v_addon.id,(v_ctx->>'cycle_start')::timestamptz,(v_ctx->>'cycle_end')::timestamptz,v_addon.translation_characters,'active') returning id into v_id;
 insert into public.admin_usage_adjustments(admin_id,user_id,action,new_value,reason) values(auth.uid(),p_user_id,'assign_translation_addon',jsonb_build_object('addon_id',v_addon.id,'characters',v_addon.translation_characters),coalesce(nullif(trim(p_reason),''),'Admin assignment'));
 perform public.admin_center_write_audit('translation_addon_assigned',p_user_id,jsonb_build_object('addon_id',v_addon.id,'characters',v_addon.translation_characters,'reason',coalesce(nullif(trim(p_reason),''),'Admin assignment')));
 return v_id;
end $$;
revoke all on function public.admin_center_assign_translation_addon_v25(uuid,uuid,text) from public;
grant execute on function public.admin_center_assign_translation_addon_v25(uuid,uuid,text) to authenticated;

create or replace function public.melo_chat_entitlement_guard_v25() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.role()='service_role' or auth.uid() is null then return new; end if;
 if not public.melo_has_entitlement_v25('can_chat',auth.uid()) then raise exception 'PLAN_UPGRADE_REQUIRED:chat'; end if;
 return new;
end $$;
do $$ begin
 if to_regclass('public.chat_messages') is not null then
   execute 'drop trigger if exists melo_chat_entitlement_guard_v25 on public.chat_messages';
   execute 'create trigger melo_chat_entitlement_guard_v25 before insert on public.chat_messages for each row execute function public.melo_chat_entitlement_guard_v25()';
 end if;
end $$;

create or replace function public.melo_profile_discovery_scores_v25(p_profile_ids uuid[])
returns table(profile_id uuid,ranking_score numeric,boost_priority int)
language sql security definer set search_path=public as $$
 select p.id,
   extract(epoch from coalesce(p.profile_boosted_at,p.created_at)) +
   case when p.profile_boosted_at is not null then coalesce(sp.boost_priority,0)*3600 else 0 end as ranking_score,
   coalesce(sp.boost_priority,0)
 from public.profiles p
 left join lateral (
   select pl.boost_priority from public.user_subscriptions us
   join public.subscription_plans pl on pl.id=us.plan_id
   where us.user_id=p.id and us.status='active' and (us.expires_at is null or us.expires_at>now())
   order by us.starts_at desc limit 1
 ) sp on true
 where p.id=any(coalesce(p_profile_ids,'{}'::uuid[]));
$$;
revoke all on function public.melo_profile_discovery_scores_v25(uuid[]) from public;
grant execute on function public.melo_profile_discovery_scores_v25(uuid[]) to authenticated;

create or replace function public.get_social_feed_boosted_v11(
  p_limit integer default 30,p_offset integer default 0,p_author_id uuid default null,p_saved_only boolean default false,p_post_id uuid default null
)
returns table(id uuid,author_id uuid,body text,visibility text,image_paths text[],location_name text,latitude double precision,longitude double precision,activity_type text,activity_id uuid,activity_title text,activity_subtitle text,activity_image_path text,like_count bigint,comment_count bigint,share_count bigint,is_liked boolean,is_saved boolean,can_manage boolean,created_at timestamptz,updated_at timestamptz,boosted_at timestamptz)
language sql security definer set search_path=public as $$
 select p.id,p.author_id,p.body,p.visibility::text,p.image_paths,p.location_name,p.latitude,p.longitude,p.activity_type::text,p.activity_id,p.activity_title,p.activity_subtitle,p.activity_image_path,
 (select count(*) from public.social_post_likes l where l.post_id=p.id),(select count(*) from public.social_post_comments c where c.post_id=p.id),0::bigint,
 exists(select 1 from public.social_post_likes l where l.post_id=p.id and l.user_id=auth.uid()),exists(select 1 from public.social_post_saves s where s.post_id=p.id and s.user_id=auth.uid()),p.author_id=auth.uid(),p.created_at,p.updated_at,p.boosted_at
 from public.social_posts p
 where (p_post_id is null or p.id=p_post_id) and (p_author_id is null or p.author_id=p_author_id)
 and (not p_saved_only or exists(select 1 from public.social_post_saves s where s.post_id=p.id and s.user_id=auth.uid()))
 and (p.author_id=auth.uid() or p.visibility::text='public' or (p.visibility::text='friends' and auth.uid()=any(p.audience_user_ids)))
 order by (
   extract(epoch from coalesce(p.boosted_at,p.created_at)) +
   case when p.boosted_at is not null then coalesce((select pl.boost_priority from public.user_subscriptions us join public.subscription_plans pl on pl.id=us.plan_id where us.user_id=p.author_id and us.status='active' and (us.expires_at is null or us.expires_at>now()) order by us.starts_at desc limit 1),0)*3600 else 0 end
 ) desc,p.created_at desc,p.id desc
 limit greatest(1,least(coalesce(p_limit,30),50)) offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.get_social_feed_boosted_v11(integer,integer,uuid,boolean,uuid) from public;
grant execute on function public.get_social_feed_boosted_v11(integer,integer,uuid,boolean,uuid) to authenticated;

commit;
notify pgrst,'reload schema';
