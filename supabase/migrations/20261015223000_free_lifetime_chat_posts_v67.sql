-- Melo Chat Lite V67
-- Free plan quota policy:
--   * Chat: 20,000 outgoing text characters for the lifetime of the account (no reset).
--   * Profile posts: 3 posts for the lifetime Free quota (no reset).
--   * Premium / Premium+ keep their existing monthly post quotas and unlimited chat.
--   * Existing V66 Free chat usage is carried forward where possible.
--   * Existing posts of users who are currently Free are counted toward the 3-post lifetime quota.

begin;

alter table public.subscription_plans
  add column if not exists chat_monthly_limit bigint;

alter table public.subscription_plans
  add column if not exists chat_lifetime_limit bigint;

alter table public.subscription_usage
  add column if not exists chat_characters_used bigint not null default 0;

-- Keep the V66 column populated for backward compatibility while V67 clients deploy.
update public.subscription_plans
set can_view_profiles = true,
    can_interested = true,
    can_match = true,
    can_comment = true,
    chat_lifetime_limit = 20000,
    chat_monthly_limit = 20000,
    profile_post_limit = 3,
    updated_at = now()
where lower(code) = 'free';

update public.subscription_plans
set chat_lifetime_limit = null,
    chat_monthly_limit = null,
    updated_at = now()
where lower(code) in ('premium','premium_plus');

create table if not exists public.user_lifetime_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_chat_characters_used bigint not null default 0 check (free_chat_characters_used >= 0),
  free_profile_posts_used integer not null default 0 check (free_profile_posts_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_lifetime_usage enable row level security;

drop policy if exists user_lifetime_usage_select_own on public.user_lifetime_usage;
create policy user_lifetime_usage_select_own
on public.user_lifetime_usage
for select
to authenticated
using (user_id = auth.uid());

-- Seed only users whose effective package is currently Free. This avoids charging
-- paid-plan activity against a future Free lifetime allowance.
with effective_plan as (
  select
    u.id as user_id,
    coalesce((
      select lower(p.code)
      from public.user_subscriptions s
      join public.subscription_plans p on p.id = s.plan_id
      where s.user_id = u.id
        and s.status = 'active'
        and s.starts_at <= now()
        and (s.expires_at is null or s.expires_at > now())
      order by s.starts_at desc
      limit 1
    ), 'free') as plan_code
  from auth.users u
), seed as (
  select
    e.user_id,
    case when e.plan_code = 'free' then coalesce((
      select sum(su.chat_characters_used)::bigint
      from public.subscription_usage su
      where su.user_id = e.user_id
    ), 0) else 0 end as chat_used,
    case when e.plan_code = 'free' then coalesce((
      select count(*)::integer
      from public.social_posts sp
      where sp.author_id = e.user_id
    ), 0) else 0 end as posts_used
  from effective_plan e
)
insert into public.user_lifetime_usage(user_id, free_chat_characters_used, free_profile_posts_used)
select user_id, chat_used, posts_used
from seed
on conflict (user_id) do update
set free_chat_characters_used = greatest(public.user_lifetime_usage.free_chat_characters_used, excluded.free_chat_characters_used),
    free_profile_posts_used = greatest(public.user_lifetime_usage.free_profile_posts_used, excluded.free_profile_posts_used),
    updated_at = now();

-- Plan context keeps monthly cycles for paid-plan quotas, but exposes the Free
-- lifetime chat ceiling separately and reports no Free reset date.
create or replace function public.melo_plan_context_v25(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=coalesce(p_user_id,auth.uid());
  v_plan public.subscription_plans%rowtype;
  v_sub public.user_subscriptions%rowtype;
  v_anchor timestamptz;
  v_start timestamptz;
  v_end timestamptz;
  v_months int;
  v_addon_limit bigint:=0;
  v_addon_used bigint:=0;
  v_is_free boolean:=false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_user_id is not null and p_user_id<>auth.uid() and not public.is_admin_center_admin() then
    raise exception 'Not permitted';
  end if;

  select * into v_sub
  from public.user_subscriptions s
  where s.user_id=v_uid
    and s.status='active'
    and s.starts_at<=now()
    and (s.expires_at is null or s.expires_at>now())
  order by s.starts_at desc
  limit 1;

  if v_sub.id is not null then
    select * into v_plan from public.subscription_plans where id=v_sub.plan_id;
    v_anchor:=coalesce(v_sub.billing_anchor,v_sub.starts_at);
  else
    select * into v_plan from public.subscription_plans where code='free' limit 1;
    select created_at into v_anchor from auth.users where id=v_uid;
  end if;

  if v_plan.id is null then raise exception 'Free plan is not configured'; end if;
  v_is_free:=lower(coalesce(v_plan.code,''))='free';

  v_anchor:=coalesce(v_anchor,now());
  v_months:=greatest(0,(date_part('year',age(now(),v_anchor))::int*12)+date_part('month',age(now(),v_anchor))::int);
  v_start:=v_anchor+make_interval(months=>v_months);
  if v_start>now() then v_start:=v_start-interval '1 month'; end if;
  v_end:=v_start+interval '1 month';

  select coalesce(sum(character_limit),0),coalesce(sum(character_used),0)
  into v_addon_limit,v_addon_used
  from public.user_translation_addons
  where user_id=v_uid
    and status='active'
    and character_used<character_limit;

  return jsonb_build_object(
    'user_id',v_uid,'plan_id',v_plan.id,'plan_code',v_plan.code,'plan_name',v_plan.name,
    'subscription_start',v_sub.starts_at,'subscription_end',v_sub.expires_at,
    'billing_period_months',coalesce(v_sub.billing_period_months,1),
    'cycle_start',v_start,'cycle_end',v_end,'next_reset',case when v_is_free then null else v_end end,
    'profile_post_limit',v_plan.profile_post_limit,'high_post_limit',v_plan.high_post_limit,
    'profile_post_lifetime',v_is_free,
    'translation_limit',v_plan.translation_monthly_limit,
    'chat_monthly_limit',v_plan.chat_monthly_limit,
    'chat_lifetime_limit',case when v_is_free then coalesce(v_plan.chat_lifetime_limit,20000) else null end,
    'chat_lifetime',v_is_free,
    'profile_boost_limit',v_plan.profile_boost_monthly_limit,
    'post_boost_limit',v_plan.post_boost_monthly_limit,
    'addon_translation_limit',v_addon_limit,'addon_translation_used',v_addon_used,
    'can_like',v_plan.can_like,'can_view_profiles',v_plan.can_view_profiles,
    'can_interested',v_plan.can_interested,'can_follow',v_plan.can_follow,
    'can_match',v_plan.can_match,'can_chat',v_plan.can_chat,
    'can_comment',v_plan.can_comment,'can_save_post',v_plan.can_save_post,
    'can_use_translation',v_plan.can_use_translation,
    'can_buy_translation_addon',v_plan.can_buy_translation_addon,
    'priority_support',v_plan.priority_support,'boost_priority',v_plan.boost_priority,
    'is_admin',public.is_admin_center_admin()
  );
end $$;
revoke all on function public.melo_plan_context_v25(uuid) from public;
grant execute on function public.melo_plan_context_v25(uuid) to authenticated;

create or replace function public.melo_get_my_plan_usage_v25()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v jsonb:=public.melo_plan_context_v25(auth.uid());
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_end timestamptz:=(v->>'cycle_end')::timestamptz;
  v_usage public.subscription_usage%rowtype;
  v_lifetime public.user_lifetime_usage%rowtype;
  v_addon_used bigint:=coalesce((v->>'addon_translation_used')::bigint,0);
  v_is_free boolean:=lower(coalesce(v->>'plan_code','free'))='free';
begin
  insert into public.subscription_usage(user_id,cycle_start,cycle_end)
  values(v_uid,v_start,v_end)
  on conflict(user_id,cycle_start) do update set cycle_end=excluded.cycle_end
  returning * into v_usage;

  insert into public.user_lifetime_usage(user_id)
  values(v_uid)
  on conflict(user_id) do nothing;
  select * into v_lifetime from public.user_lifetime_usage where user_id=v_uid;

  return v || jsonb_build_object(
    'base_translation_used',v_usage.base_translation_used,
    'addon_translation_used',v_addon_used,
    'chat_characters_used',case when v_is_free then v_lifetime.free_chat_characters_used else v_usage.chat_characters_used end,
    'profile_boost_used',v_usage.profile_boost_used,
    'post_boost_used',v_usage.post_boost_used,
    'profile_posts_used',case when v_is_free then v_lifetime.free_profile_posts_used else v_usage.profile_posts_used end,
    'free_lifetime_chat_characters_used',v_lifetime.free_chat_characters_used,
    'free_lifetime_profile_posts_used',v_lifetime.free_profile_posts_used,
    'bonus_translation_limit',v_usage.bonus_translation_limit,
    'bonus_profile_boost_limit',v_usage.bonus_profile_boost_limit,
    'bonus_post_boost_limit',v_usage.bonus_post_boost_limit,
    'profile_boost_limit',coalesce((v->>'profile_boost_limit')::int,0)+v_usage.bonus_profile_boost_limit,
    'post_boost_limit',coalesce((v->>'post_boost_limit')::int,0)+v_usage.bonus_post_boost_limit,
    'translation_total_limit',coalesce((v->>'translation_limit')::bigint,0)+coalesce((v->>'addon_translation_limit')::bigint,0)+v_usage.bonus_translation_limit,
    'translation_total_used',v_usage.base_translation_used+v_addon_used
  );
end $$;
revoke all on function public.melo_get_my_plan_usage_v25() from public;
grant execute on function public.melo_get_my_plan_usage_v25() to authenticated;

-- Free profile posts now consume a lifetime counter. Paid-plan profile-post,
-- Profile Boost and Post Boost quota behavior remains monthly as before.
create or replace function public.melo_consume_quota_v25(p_kind text,p_amount int default 1,p_target_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_plan text:=lower(coalesce(v->>'plan_code','free'));
  v_limit int;
  v_used int;
  v_col text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_amount<=0 then raise exception 'Invalid usage amount'; end if;

  if p_kind='profile_post' and v_plan='free' then
    v_limit:=coalesce(nullif(v->>'profile_post_limit','')::int,3);
    insert into public.user_lifetime_usage(user_id) values(v_uid) on conflict(user_id) do nothing;
    select free_profile_posts_used into v_used
    from public.user_lifetime_usage
    where user_id=v_uid
    for update;
    v_used:=coalesce(v_used,0);
    if v_used+p_amount>v_limit then raise exception 'PLAN_QUOTA_EXCEEDED:profile_post'; end if;
    update public.user_lifetime_usage
    set free_profile_posts_used=free_profile_posts_used+p_amount,updated_at=now()
    where user_id=v_uid;
    return public.melo_get_my_plan_usage_v25();
  elsif p_kind='profile_post' then
    v_limit:=nullif(v->>'profile_post_limit','')::int;
    v_used:=(v->>'profile_posts_used')::int;
    v_col:='profile_posts_used';
  elsif p_kind='profile_boost' then
    v_limit:=(v->>'profile_boost_limit')::int;
    v_used:=(v->>'profile_boost_used')::int;
    v_col:='profile_boost_used';
  elsif p_kind='post_boost' then
    v_limit:=(v->>'post_boost_limit')::int;
    v_used:=(v->>'post_boost_used')::int;
    v_col:='post_boost_used';
  else
    raise exception 'Unknown quota kind';
  end if;

  if v_limit is not null and v_used+p_amount>v_limit then
    raise exception 'PLAN_QUOTA_EXCEEDED:%',p_kind;
  end if;

  if v_col='profile_posts_used' then
    update public.subscription_usage set profile_posts_used=profile_posts_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
  elsif v_col='profile_boost_used' then
    update public.subscription_usage set profile_boost_used=profile_boost_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
  else
    update public.subscription_usage set post_boost_used=post_boost_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
  end if;

  if p_kind in ('profile_boost','post_boost') then
    insert into public.boost_usage(user_id,boost_type,target_id,cycle_start)
    values(v_uid,case when p_kind='profile_boost' then 'profile' else 'post' end,p_target_id,v_start);
  end if;
  return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_consume_quota_v25(text,int,uuid) from public;
grant execute on function public.melo_consume_quota_v25(text,int,uuid) to authenticated;

create or replace function public.melo_check_chat_message_v67(p_body text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_plan text:=lower(coalesce(v->>'plan_code','free'));
  v_chars int:=char_length(coalesce(p_body,''));
  v_limit bigint:=case when v_plan='free' then coalesce(nullif(v->>'chat_lifetime_limit','')::bigint,20000) else null end;
  v_used bigint:=coalesce((v->>'chat_characters_used')::bigint,0);
  v_message_limit int:=case when v_plan='free' then 500 else 2000 end;
begin
  if v_chars<1 then return v; end if;
  if v_chars>v_message_limit then
    raise exception 'PLAN_MESSAGE_TOO_LONG:chat:%',v_message_limit;
  end if;
  if v_plan='free' and v_used+v_chars>v_limit then
    raise exception 'PLAN_QUOTA_EXCEEDED:chat';
  end if;
  return v || jsonb_build_object(
    'chat_message_characters',v_chars,
    'chat_message_limit',v_message_limit,
    'chat_remaining',case when v_limit is null then null else greatest(0,v_limit-v_used) end,
    'chat_quota_scope',case when v_plan='free' then 'lifetime' else 'unlimited' end
  );
end $$;
revoke all on function public.melo_check_chat_message_v67(text) from public;
grant execute on function public.melo_check_chat_message_v67(text) to authenticated;

create or replace function public.melo_record_chat_message_v67(p_body text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_uid uuid:=auth.uid();
  v_plan text:=lower(coalesce(v->>'plan_code','free'));
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_chars int:=char_length(coalesce(p_body,''));
  v_limit bigint:=case when v_plan='free' then coalesce(nullif(v->>'chat_lifetime_limit','')::bigint,20000) else null end;
  v_used bigint:=0;
  v_message_limit int:=case when v_plan='free' then 500 else 2000 end;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_chars<1 then return v; end if;
  if v_chars>v_message_limit then
    raise exception 'PLAN_MESSAGE_TOO_LONG:chat:%',v_message_limit;
  end if;

  if v_plan='free' then
    insert into public.user_lifetime_usage(user_id) values(v_uid) on conflict(user_id) do nothing;
    select free_chat_characters_used into v_used
    from public.user_lifetime_usage
    where user_id=v_uid
    for update;
    v_used:=coalesce(v_used,0);
    if v_used+v_chars>v_limit then
      raise exception 'PLAN_QUOTA_EXCEEDED:chat';
    end if;
    update public.user_lifetime_usage
    set free_chat_characters_used=free_chat_characters_used+v_chars,updated_at=now()
    where user_id=v_uid;
  else
    update public.subscription_usage
    set chat_characters_used=chat_characters_used+v_chars,updated_at=now()
    where user_id=v_uid and cycle_start=v_start;
  end if;

  return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_record_chat_message_v67(text) from public;
grant execute on function public.melo_record_chat_message_v67(text) to authenticated;

-- Compatibility wrappers: if SQL is deployed slightly before the V67 client,
-- an already-open V66 page still follows the new lifetime policy.
create or replace function public.melo_check_chat_message_v66(p_body text)
returns jsonb
language sql
security definer
set search_path=public
as $$ select public.melo_check_chat_message_v67(p_body) $$;
revoke all on function public.melo_check_chat_message_v66(text) from public;
grant execute on function public.melo_check_chat_message_v66(text) to authenticated;

create or replace function public.melo_record_chat_message_v66(p_body text)
returns jsonb
language sql
security definer
set search_path=public
as $$ select public.melo_record_chat_message_v67(p_body) $$;
revoke all on function public.melo_record_chat_message_v66(text) from public;
grant execute on function public.melo_record_chat_message_v66(text) to authenticated;

commit;
notify pgrst,'reload schema';
