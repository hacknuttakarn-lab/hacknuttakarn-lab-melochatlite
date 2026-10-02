-- Melo Chat Lite V31
-- 1) Admin/Super Admin use all product features without monthly quota consumption.
-- 2) Plan usage returned to Admin/Super Admin exposes Premium+-style entitlements as unlimited.

create or replace function public.melo_get_my_plan_usage_v25()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v jsonb:=public.melo_plan_context_v25(auth.uid());
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_end timestamptz:=(v->>'cycle_end')::timestamptz;
  v_usage public.subscription_usage%rowtype;
  v_admin boolean:=coalesce((v->>'is_admin')::boolean,false);
begin
  insert into public.subscription_usage(user_id,cycle_start,cycle_end)
  values(v_uid,v_start,v_end)
  on conflict(user_id,cycle_start) do update set cycle_end=excluded.cycle_end
  returning * into v_usage;

  v:=v || jsonb_build_object(
    'base_translation_used',v_usage.base_translation_used,
    'addon_translation_used',v_usage.addon_translation_used,
    'profile_boost_used',v_usage.profile_boost_used,
    'post_boost_used',v_usage.post_boost_used,
    'profile_posts_used',v_usage.profile_posts_used,
    'bonus_translation_limit',v_usage.bonus_translation_limit,
    'bonus_profile_boost_limit',v_usage.bonus_profile_boost_limit,
    'bonus_post_boost_limit',v_usage.bonus_post_boost_limit,
    'profile_boost_limit',coalesce((v->>'profile_boost_limit')::int,0)+v_usage.bonus_profile_boost_limit,
    'post_boost_limit',coalesce((v->>'post_boost_limit')::int,0)+v_usage.bonus_post_boost_limit,
    'translation_total_limit',coalesce((v->>'translation_limit')::bigint,0)+coalesce((v->>'addon_translation_limit')::bigint,0)+v_usage.bonus_translation_limit,
    'translation_total_used',v_usage.base_translation_used+v_usage.addon_translation_used
  );

  if v_admin then
    v:=v || jsonb_build_object(
      'plan_code','admin_unlimited',
      'plan_name','Admin Unlimited',
      'profile_post_limit',null,
      'high_post_limit',true,
      'profile_boost_limit',2147483647,
      'post_boost_limit',2147483647,
      'can_like',true,
      'can_view_profiles',true,
      'can_interested',true,
      'can_follow',true,
      'can_match',true,
      'can_chat',true,
      'can_comment',true,
      'can_save_post',true,
      'can_use_translation',true,
      'can_buy_translation_addon',false,
      'priority_support',true,
      'boost_priority',1000,
      'admin_unlimited',true
    );
  end if;
  return v;
end $$;
revoke all on function public.melo_get_my_plan_usage_v25() from public;
grant execute on function public.melo_get_my_plan_usage_v25() to authenticated;

create or replace function public.melo_consume_quota_v25(p_kind text,p_amount int default 1,p_target_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_limit int; v_used int; v_col text;
begin
  if p_amount<=0 then raise exception 'Invalid usage amount'; end if;
  if coalesce((v->>'is_admin')::boolean,false) then return v; end if;

  if p_kind='profile_post' then v_limit:=nullif(v->>'profile_post_limit','')::int; v_used:=(v->>'profile_posts_used')::int; v_col:='profile_posts_used';
  elsif p_kind='profile_boost' then v_limit:=(v->>'profile_boost_limit')::int; v_used:=(v->>'profile_boost_used')::int; v_col:='profile_boost_used';
  elsif p_kind='post_boost' then v_limit:=(v->>'post_boost_limit')::int; v_used:=(v->>'post_boost_used')::int; v_col:='post_boost_used';
  else raise exception 'Unknown quota kind'; end if;

  if v_limit is not null and v_used+p_amount>v_limit then raise exception 'PLAN_QUOTA_EXCEEDED:%',p_kind; end if;
  if v_col='profile_posts_used' then update public.subscription_usage set profile_posts_used=profile_posts_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
  elsif v_col='profile_boost_used' then update public.subscription_usage set profile_boost_used=profile_boost_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start;
  else update public.subscription_usage set post_boost_used=post_boost_used+p_amount,updated_at=now() where user_id=v_uid and cycle_start=v_start; end if;

  if p_kind in ('profile_boost','post_boost') then
    insert into public.boost_usage(user_id,boost_type,target_id,cycle_start)
    values(v_uid,case when p_kind='profile_boost' then 'profile' else 'post' end,p_target_id,v_start);
  end if;
  return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_consume_quota_v25(text,int,uuid) from public;
grant execute on function public.melo_consume_quota_v25(text,int,uuid) to authenticated;
