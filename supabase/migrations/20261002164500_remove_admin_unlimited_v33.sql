-- Melo Chat Lite V33
-- Remove the implicit "Admin Unlimited" product-plan override.
-- Admin/Super Admin now use the package explicitly assigned to their user account,
-- exactly like other users. Admin Center permissions remain governed by admin permissions.
-- Support-chat translation remains handled separately from normal user-plan translation.

create or replace function public.melo_get_my_plan_usage_v25()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v jsonb:=public.melo_plan_context_v25(auth.uid());
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_end timestamptz:=(v->>'cycle_end')::timestamptz;
  v_usage public.subscription_usage%rowtype;
begin
  insert into public.subscription_usage(user_id,cycle_start,cycle_end)
  values(v_uid,v_start,v_end)
  on conflict(user_id,cycle_start) do update set cycle_end=excluded.cycle_end
  returning * into v_usage;

  return v || jsonb_build_object(
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
end $$;
revoke all on function public.melo_get_my_plan_usage_v25() from public;
grant execute on function public.melo_get_my_plan_usage_v25() to authenticated;

-- Admin role no longer bypasses user-area package entitlements.
create or replace function public.melo_has_entitlement_v25(p_key text,p_user_id uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public as $$
declare
  v jsonb:=public.melo_plan_context_v25(p_user_id);
begin
  return coalesce((v->>p_key)::boolean,false);
exception when others then
  return false;
end $$;
revoke all on function public.melo_has_entitlement_v25(text,uuid) from public;
grant execute on function public.melo_has_entitlement_v25(text,uuid) to authenticated;

-- Quotas always follow the assigned package, including Admin/Super Admin accounts.
create or replace function public.melo_consume_quota_v25(p_kind text,p_amount int default 1,p_target_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v jsonb:=public.melo_get_my_plan_usage_v25();
  v_uid uuid:=auth.uid();
  v_start timestamptz:=(v->>'cycle_start')::timestamptz;
  v_limit int;
  v_used int;
  v_col text;
begin
  if p_amount<=0 then raise exception 'Invalid usage amount'; end if;

  if p_kind='profile_post' then
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

-- Normal User Area translation follows the assigned package for every account.
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
  v_take_base bigint;
  v_take_add bigint;
begin
  if not coalesce((v->>'can_use_translation')::boolean,false) then
    raise exception 'PLAN_UPGRADE_REQUIRED:translation';
  end if;
  if v_chars<1 then return v; end if;
  if (v_base_limit-v_base_used)+(v_add_limit-v_add_used)<v_chars then
    raise exception 'PLAN_QUOTA_EXCEEDED:translation';
  end if;

  v_take_base:=least(v_chars::bigint,greatest(0,v_base_limit-v_base_used));
  v_take_add:=v_chars-v_take_base;

  update public.subscription_usage
  set base_translation_used=base_translation_used+v_take_base,
      addon_translation_used=addon_translation_used+v_take_add,
      updated_at=now()
  where user_id=v_uid and cycle_start=v_start;

  if v_take_add>0 then
    update public.user_translation_addons a
    set character_used=least(a.character_limit,a.character_used+v_take_add::int)
    where a.id=(
      select id from public.user_translation_addons
      where user_id=v_uid and status='active' and cycle_start=v_start and character_used<character_limit
      order by created_at limit 1
    );
  end if;

  insert into public.translation_cache(cache_key,original_text,original_language,translated_text,translated_language,translation_provider,translation_character_count)
  values(public.melo_translation_cache_key_v25(p_original,p_target),p_original,p_original_language,p_translated,lower(p_target),coalesce(p_provider,'google'),v_chars)
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
