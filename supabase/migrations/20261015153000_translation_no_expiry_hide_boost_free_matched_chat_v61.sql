-- Melo Chat Lite V61
-- 1) Translation Add-on credits never expire; they remain until fully used.
-- 2) Free users may continue direct chat with users who are still in profile_matches.
-- UI hiding for Boost Add-ons is handled in the V61 overlay; boost data/history is preserved.

begin;

-- Restore unused Translation Add-on credits that previously aged out of a billing cycle.
update public.user_translation_addons
set cycle_end = 'infinity'::timestamptz,
    status = case when character_used >= character_limit then 'used' else 'active' end
where status in ('active','used');

-- Plan context: monthly package quota still resets by billing month, but purchased
-- translation add-on credit is lifetime credit and is aggregated across purchases.
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

-- Usage payload: add-on usage is lifetime usage from user_translation_addons,
-- not a billing-month counter from subscription_usage.
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

-- Consume monthly package translation first, then the oldest purchased lifetime credits.
create or replace function public.melo_record_translation_v25(
  p_original text,
  p_original_language text,
  p_translated text,
  p_target text,
  p_provider text default 'google'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_chars int:=char_length(coalesce(p_translated,''));
  v_base_limit bigint:=coalesce((v->>'translation_limit')::bigint,0)+coalesce((v->>'bonus_translation_limit')::bigint,0);
  v_base_used bigint:=coalesce((v->>'base_translation_used')::bigint,0);
  v_add_limit bigint:=coalesce((v->>'addon_translation_limit')::bigint,0);
  v_add_used bigint:=coalesce((v->>'addon_translation_used')::bigint,0);
  v_plan_code text:=lower(coalesce(v->>'plan_code',v->>'current_plan_code',v->>'code',''));
  v_can_translate boolean;
  v_take_base bigint;
  v_remaining bigint;
  v_take bigint;
  r record;
begin
  v_can_translate := coalesce((v->>'can_use_translation')::boolean,false)
    or v_plan_code in ('premium','premium_plus')
    or (v_add_limit-v_add_used) > 0;

  if not v_can_translate then raise exception 'PLAN_UPGRADE_REQUIRED:translation'; end if;
  if v_chars<1 then return v; end if;
  if greatest(0,v_base_limit-v_base_used)+greatest(0,v_add_limit-v_add_used)<v_chars then
    raise exception 'PLAN_QUOTA_EXCEEDED:translation';
  end if;

  v_take_base:=least(v_chars::bigint,greatest(0,v_base_limit-v_base_used));
  v_remaining:=v_chars-v_take_base;

  if v_take_base>0 then
    update public.subscription_usage
    set base_translation_used=base_translation_used+v_take_base,updated_at=now()
    where user_id=v_uid and cycle_start=v_start;
  end if;

  if v_remaining>0 then
    for r in
      select id,character_limit,character_used
      from public.user_translation_addons
      where user_id=v_uid and status='active' and character_used<character_limit
      order by created_at asc,id asc
      for update
    loop
      exit when v_remaining<=0;
      v_take:=least(v_remaining,(r.character_limit-r.character_used)::bigint);
      update public.user_translation_addons
      set character_used=character_used+v_take::int,
          status=case when character_used+v_take::int>=character_limit then 'used' else 'active' end,
          cycle_end='infinity'::timestamptz
      where id=r.id;
      v_remaining:=v_remaining-v_take;
    end loop;
  end if;

  if v_remaining>0 then raise exception 'PLAN_QUOTA_EXCEEDED:translation'; end if;

  insert into public.translation_cache(
    cache_key,original_text,original_language,translated_text,translated_language,
    translation_provider,translation_character_count
  ) values(
    public.melo_translation_cache_key_v25(p_original,p_target),p_original,p_original_language,
    p_translated,lower(p_target),coalesce(p_provider,'google'),v_chars
  )
  on conflict(cache_key) do update
  set translated_text=excluded.translated_text,
      original_language=excluded.original_language,
      translation_provider=excluded.translation_provider,
      translation_character_count=excluded.translation_character_count,
      translated_at=now();

  return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_record_translation_v25(text,text,text,text,text) from public;
grant execute on function public.melo_record_translation_v25(text,text,text,text,text) to authenticated;

-- Admin assignment creates non-expiring credit.
create or replace function public.admin_center_assign_translation_addon_v25(
  p_user_id uuid,p_addon_id uuid,p_reason text default 'Admin assignment'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ctx jsonb;
  v_addon public.translation_addons%rowtype;
  v_id uuid;
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
  select * into v_addon from public.translation_addons where id=p_addon_id and is_active=true;
  if v_addon.id is null then raise exception 'add-on not found'; end if;
  v_ctx:=public.melo_plan_context_v25(p_user_id);
  if not ((v_ctx->>'plan_code')=any(v_addon.eligible_plans)) then raise exception 'plan not eligible for add-on'; end if;

  insert into public.user_translation_addons(
    user_id,addon_id,cycle_start,cycle_end,character_limit,status
  ) values(
    p_user_id,v_addon.id,now(),'infinity'::timestamptz,v_addon.translation_characters,'active'
  ) returning id into v_id;

  insert into public.admin_usage_adjustments(admin_id,user_id,action,new_value,reason)
  values(auth.uid(),p_user_id,'assign_translation_addon',
    jsonb_build_object('addon_id',v_addon.id,'characters',v_addon.translation_characters,'expires',false),
    coalesce(nullif(trim(p_reason),''),'Admin assignment'));
  perform public.admin_center_write_audit('translation_addon_assigned',p_user_id,
    jsonb_build_object('addon_id',v_addon.id,'characters',v_addon.translation_characters,'expires',false,'reason',coalesce(nullif(trim(p_reason),''),'Admin assignment')));
  return v_id;
end $$;
revoke all on function public.admin_center_assign_translation_addon_v25(uuid,uuid,text) from public;
grant execute on function public.admin_center_assign_translation_addon_v25(uuid,uuid,text) to authenticated;

-- Stripe fulfillment creates non-expiring credit, while retaining idempotency.
create or replace function public.melo_fulfill_stripe_translation_addon_v40(
  p_event_id text,p_session_id text,p_environment text,p_user_id uuid,p_addon_id uuid,
  p_amount numeric,p_currency text default 'THB'
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_addon public.translation_addons%rowtype;
  v_sub public.user_subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_fulfillment_id uuid;
  v_transaction_id uuid;
  v_user_addon_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'service role required'; end if;
  if nullif(trim(coalesce(p_event_id,'')),'') is null or nullif(trim(coalesce(p_session_id,'')),'') is null then
    raise exception 'stripe event/session id required';
  end if;
  if p_environment not in ('sandbox','live') then raise exception 'invalid stripe environment'; end if;
  if p_user_id is null or p_addon_id is null then raise exception 'missing checkout metadata'; end if;

  select * into v_addon from public.translation_addons where id=p_addon_id and is_active=true;
  if v_addon.id is null then raise exception 'translation add-on not found or inactive'; end if;

  select * into v_sub from public.user_subscriptions
  where user_id=p_user_id and status='active' and starts_at<=now() and (expires_at is null or expires_at>now())
  order by starts_at desc limit 1;
  if v_sub.id is null then raise exception 'active paid subscription required'; end if;

  select * into v_plan from public.subscription_plans where id=v_sub.plan_id and is_active=true;
  if v_plan.id is null then raise exception 'active package not found'; end if;
  if not (v_plan.code=any(v_addon.eligible_plans)) or not coalesce(v_plan.can_buy_translation_addon,false) then
    raise exception 'translation add-on is not eligible for current package';
  end if;

  insert into public.stripe_translation_addon_fulfillments(
    stripe_event_id,stripe_session_id,stripe_environment,user_id,addon_id,amount,currency
  ) values(
    trim(p_event_id),trim(p_session_id),p_environment,p_user_id,p_addon_id,
    greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB'))
  ) on conflict do nothing returning id into v_fulfillment_id;

  if v_fulfillment_id is null then
    return jsonb_build_object('fulfilled',false,'duplicate',true,'session_id',p_session_id);
  end if;

  insert into public.package_transactions(user_id,plan_id,transaction_type,amount,currency,note)
  values(p_user_id,v_plan.id,'stripe_translation_addon',greatest(0,coalesce(p_amount,0)),
    upper(coalesce(nullif(trim(p_currency),''),'THB')),
    format('Stripe Translation Add-on %s; addon %s; environment %s; no expiry',p_session_id,p_addon_id,p_environment))
  returning id into v_transaction_id;

  insert into public.user_translation_addons(
    user_id,addon_id,cycle_start,cycle_end,character_limit,character_used,status,transaction_id
  ) values(
    p_user_id,p_addon_id,now(),'infinity'::timestamptz,v_addon.translation_characters,0,'active',v_transaction_id
  ) returning id into v_user_addon_id;

  return jsonb_build_object(
    'fulfilled',true,'duplicate',false,'user_translation_addon_id',v_user_addon_id,
    'addon_id',p_addon_id,'translation_characters',v_addon.translation_characters,'expires',false
  );
end $$;
revoke all on function public.melo_fulfill_stripe_translation_addon_v40(text,text,text,uuid,uuid,numeric,text) from public;
grant execute on function public.melo_fulfill_stripe_translation_addon_v40(text,text,text,uuid,uuid,numeric,text) to service_role;

-- FREE CHAT GRANDFATHERING: a free/expired member may still use chat if they
-- have at least one current profile_match. This does not grant Match creation.
create or replace function public.melo_chat_entitlement_guard_v25()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.role()='service_role' or auth.uid() is null then return new; end if;
  if not public.melo_can_use_chat_v41() then raise exception 'PLAN_UPGRADE_REQUIRED:chat'; end if;
  return new;
end $$;

-- Replace only the restrictive package gate. Existing participant/read policies
-- remain in force, so this does not expose conversations to unrelated users.
do $$
declare v_table text;
begin
  foreach v_table in array array['chat_messages','messages'] loop
    if to_regclass('public.'||v_table) is null then continue; end if;
    if exists(
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=v_table and c.relrowsecurity=true
    ) then
      execute format('drop policy if exists melo_chat_paid_read_v43 on public.%I',v_table);
      execute format(
        'create policy melo_chat_paid_read_v43 on public.%I as restrictive for select to authenticated using (public.melo_can_use_chat_v41())',
        v_table
      );
    end if;
  end loop;
end $$;

commit;
notify pgrst,'reload schema';
