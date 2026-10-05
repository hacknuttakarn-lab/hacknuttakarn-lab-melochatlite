-- Melo Chat Lite V32
-- Admin/Super Admin: product access remains unrestricted, but normal User Area translation
-- and Profile/Post Boost quotas follow Premium+ (100,000 chars, 10/10 per billing month).
-- Support Chat translation remains outside package quota and is not recorded here.

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
      'translation_limit',100000,
      'addon_translation_limit',0,
      'translation_total_limit',100000,
      'profile_boost_limit',10,
      'post_boost_limit',10,
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
      'admin_unlimited',true,
      'support_translation_unlimited',true
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
  v_admin boolean:=coalesce((v->>'is_admin')::boolean,false);
begin
  if p_amount<=0 then raise exception 'Invalid usage amount'; end if;
  -- Admin profile posting stays High Limit / Fair Use and does not consume a fixed post quota.
  if v_admin and p_kind='profile_post' then return v; end if;

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

-- Normal User Area translation for Admin/Super Admin follows the 100,000 character Premium+ quota.
create or replace function public.melo_record_translation_v25(p_original text,p_original_language text,p_translated text,p_target text,p_provider text default 'google')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_chars int:=char_length(coalesce(p_translated,''));
  v_base_limit bigint:=coalesce((v->>'translation_limit')::bigint,0);
  v_base_used bigint:=coalesce((v->>'base_translation_used')::bigint,0);
  v_add_limit bigint:=coalesce((v->>'addon_translation_limit')::bigint,0);
  v_add_used bigint:=coalesce((v->>'addon_translation_used')::bigint,0);
  v_take_base bigint; v_take_add bigint;
begin
  if not coalesce((v->>'can_use_translation')::boolean,false) then raise exception 'PLAN_UPGRADE_REQUIRED:translation'; end if;
  if v_chars<1 then return v; end if;
  if (v_base_limit-v_base_used)+(v_add_limit-v_add_used)<v_chars then raise exception 'PLAN_QUOTA_EXCEEDED:translation'; end if;
  v_take_base:=least(v_chars::bigint,greatest(0,v_base_limit-v_base_used));
  v_take_add:=v_chars-v_take_base;
  update public.subscription_usage set base_translation_used=base_translation_used+v_take_base,addon_translation_used=addon_translation_used+v_take_add,updated_at=now() where user_id=v_uid and cycle_start=v_start;
  if v_take_add>0 then
    update public.user_translation_addons a set character_used=least(a.character_limit,a.character_used+v_take_add::int) where a.id=(select id from public.user_translation_addons where user_id=v_uid and status='active' and cycle_start=v_start and character_used<character_limit order by created_at limit 1);
  end if;
  insert into public.translation_cache(cache_key,original_text,original_language,translated_text,translated_language,translation_provider,translation_character_count)
  values(public.melo_translation_cache_key_v25(p_original,p_target),p_original,p_original_language,p_translated,lower(p_target),coalesce(p_provider,'google'),v_chars)
  on conflict(cache_key) do update set translated_text=excluded.translated_text,original_language=excluded.original_language,translation_provider=excluded.translation_provider,translation_character_count=excluded.translation_character_count,translated_at=now();
  return public.melo_get_my_plan_usage_v25();
end $$;
revoke all on function public.melo_record_translation_v25(text,text,text,text,text) from public;
grant execute on function public.melo_record_translation_v25(text,text,text,text,text) to authenticated;
