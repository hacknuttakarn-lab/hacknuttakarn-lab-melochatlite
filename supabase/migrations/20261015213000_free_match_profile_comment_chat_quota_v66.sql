-- Melo Chat Lite V66
-- Free plan changes:
--   * Match creation is available (Interested + Match).
--   * Full profile viewing is available.
--   * Social post comments are available.
--   * Direct chat remains match-only through melo_can_chat_with_user_v41 / participant policies.
--   * Free direct-text chat quota: 20,000 characters per billing month.
--   * Free per-message text ceiling: 500 characters (not advertised on the package card).
-- Premium / Premium+ direct-text chat is unlimited monthly, with a 2,000-character per-message ceiling.
-- Existing Translation / Boost / Profile-post quota behavior is preserved.

begin;

alter table public.subscription_plans
  add column if not exists chat_monthly_limit bigint;

alter table public.subscription_usage
  add column if not exists chat_characters_used bigint not null default 0;

-- Keep Free discovery/social access aligned with the current product rules.
-- can_chat intentionally remains false for Free: V41 grants direct chat only when
-- the member has a match, instead of turning chat into an unrestricted entitlement.
update public.subscription_plans
set can_view_profiles = true,
    can_interested = true,
    can_match = true,
    can_comment = true,
    chat_monthly_limit = 20000,
    updated_at = now()
where lower(code) = 'free';

update public.subscription_plans
set chat_monthly_limit = null,
    updated_at = now()
where lower(code) in ('premium','premium_plus');

-- Preserve V61 non-expiring Translation Add-on behavior while exposing chat quota.
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
    'cycle_start',v_start,'cycle_end',v_end,'next_reset',v_end,
    'profile_post_limit',v_plan.profile_post_limit,'high_post_limit',v_plan.high_post_limit,
    'translation_limit',v_plan.translation_monthly_limit,
    'chat_monthly_limit',v_plan.chat_monthly_limit,
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
  v_addon_used bigint:=coalesce((v->>'addon_translation_used')::bigint,0);
begin
  insert into public.subscription_usage(user_id,cycle_start,cycle_end)
  values(v_uid,v_start,v_end)
  on conflict(user_id,cycle_start) do update set cycle_end=excluded.cycle_end
  returning * into v_usage;

  return v || jsonb_build_object(
    'base_translation_used',v_usage.base_translation_used,
    'addon_translation_used',v_addon_used,
    'chat_characters_used',v_usage.chat_characters_used,
    'profile_boost_used',v_usage.profile_boost_used,
    'post_boost_used',v_usage.post_boost_used,
    'profile_posts_used',v_usage.profile_posts_used,
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

-- Preflight check used by the direct-chat client before sending text.
create or replace function public.melo_check_chat_message_v66(p_body text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_plan text:=lower(coalesce(v->>'plan_code','free'));
  v_chars int:=char_length(coalesce(p_body,''));
  v_limit bigint:=nullif(v->>'chat_monthly_limit','')::bigint;
  v_used bigint:=coalesce((v->>'chat_characters_used')::bigint,0);
  v_message_limit int:=case when v_plan='free' then 500 else 2000 end;
begin
  if v_chars<1 then return v; end if;
  if v_chars>v_message_limit then
    raise exception 'PLAN_MESSAGE_TOO_LONG:chat:%',v_message_limit;
  end if;
  if v_plan='free' and v_limit is not null and v_used+v_chars>v_limit then
    raise exception 'PLAN_QUOTA_EXCEEDED:chat';
  end if;
  return v || jsonb_build_object(
    'chat_message_characters',v_chars,
    'chat_message_limit',v_message_limit,
    'chat_remaining',case when v_limit is null then null else greatest(0,v_limit-v_used) end
  );
end $$;
revoke all on function public.melo_check_chat_message_v66(text) from public;
grant execute on function public.melo_check_chat_message_v66(text) to authenticated;

-- Record successful outgoing direct text. Monthly quota is enforced for Free;
-- paid plans are tracked for My Plan / Usage but have no monthly ceiling.
create or replace function public.melo_record_chat_message_v66(p_body text)
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
  v_limit bigint:=nullif(v->>'chat_monthly_limit','')::bigint;
  v_used bigint;
  v_message_limit int:=case when v_plan='free' then 500 else 2000 end;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_chars<1 then return v; end if;
  if v_chars>v_message_limit then
    raise exception 'PLAN_MESSAGE_TOO_LONG:chat:%',v_message_limit;
  end if;

  select chat_characters_used
  into v_used
  from public.subscription_usage
  where user_id=v_uid and cycle_start=v_start
  for update;

  v_used:=coalesce(v_used,0);
  if v_plan='free' and v_limit is not null and v_used+v_chars>v_limit then
    raise exception 'PLAN_QUOTA_EXCEEDED:chat';
  end if;

  update public.subscription_usage
  set chat_characters_used=chat_characters_used+v_chars,
      updated_at=now()
  where user_id=v_uid and cycle_start=v_start;

  return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_record_chat_message_v66(text) from public;
grant execute on function public.melo_record_chat_message_v66(text) to authenticated;

commit;
notify pgrst,'reload schema';
