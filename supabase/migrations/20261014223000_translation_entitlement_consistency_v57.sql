-- Melo Chat Lite V57
-- Keep chat translation entitlement consistent with the assigned Premium plan / quota.
create or replace function public.melo_record_translation_v25(
  p_original text,
  p_original_language text,
  p_translated text,
  p_target text,
  p_provider text default 'google'
)
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
  v_plan_code text:=lower(coalesce(v->>'plan_code',v->>'current_plan_code',v->>'code',''));
  v_can_translate boolean;
  v_take_base bigint;
  v_take_add bigint;
begin
  v_can_translate := coalesce((v->>'can_use_translation')::boolean,false)
    or v_plan_code in ('premium','premium_plus')
    or (v_base_limit + v_add_limit) > 0;

  if not v_can_translate then
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
