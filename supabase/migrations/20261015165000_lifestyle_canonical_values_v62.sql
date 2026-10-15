-- Melo Chat Lite V62
-- Normalize lifestyle_preferences to language-neutral canonical values.
-- Keeps existing profile data, merges legacy "pet" + "pets", removes legacy "pet" key,
-- and prevents language switching from making saved choices appear missing.

create or replace function public.melo_lifestyle_value_v62(p_category text, p_value text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_value, '')))
    -- pets
    when 'dog' then case when p_category='pets' then 'dog' end
    when 'dogs' then case when p_category='pets' then 'dog' end
    when 'สุนัข' then case when p_category='pets' then 'dog' end
    when 'hunde' then case when p_category='pets' then 'dog' end
    when 'cat' then case when p_category='pets' then 'cat' end
    when 'cats' then case when p_category='pets' then 'cat' end
    when 'แมว' then case when p_category='pets' then 'cat' end
    when 'katzen' then case when p_category='pets' then 'cat' end
    when 'bird' then case when p_category='pets' then 'bird' end
    when 'birds' then case when p_category='pets' then 'bird' end
    when 'นก' then case when p_category='pets' then 'bird' end
    when 'vögel' then case when p_category='pets' then 'bird' end
    when 'fish' then case when p_category='pets' then 'fish' end
    when 'ปลา' then case when p_category='pets' then 'fish' end
    when 'fische' then case when p_category='pets' then 'fish' end
    when 'other_pets' then case when p_category='pets' then 'other_pets' end
    when 'other pets' then case when p_category='pets' then 'other_pets' end
    when 'สัตว์เลี้ยงอื่น ๆ' then case when p_category='pets' then 'other_pets' end
    when 'andere haustiere' then case when p_category='pets' then 'other_pets' end
    when 'no_pets' then case when p_category='pets' then 'no_pets' end
    when 'no pets' then case when p_category='pets' then 'no_pets' end
    when 'ไม่มีสัตว์เลี้ยง' then case when p_category='pets' then 'no_pets' end
    when 'keine haustiere' then case when p_category='pets' then 'no_pets' end

    -- drink / smoke share some labels, so category decides canonical value
    when 'never' then case when p_category in ('drink','smoke') then 'never' end
    when 'nie' then case when p_category in ('drink','smoke') then 'never' end
    when 'ไม่ดื่ม' then case when p_category='drink' then 'never' end
    when 'ไม่สูบ' then case when p_category='smoke' then 'never' end
    when 'rarely' then case when p_category='drink' then 'rarely' when p_category='exercise' then 'rarely' end
    when 'selten' then case when p_category='drink' then 'rarely' when p_category='exercise' then 'rarely' end
    when 'ดื่มเล็กน้อย' then case when p_category='drink' then 'rarely' end
    when 'special occasions' then case when p_category='drink' then 'special_occasions' end
    when 'special_occasions' then case when p_category='drink' then 'special_occasions' end
    when 'ดื่มตามโอกาสพิเศษ' then case when p_category='drink' then 'special_occasions' end
    when 'besondere anlässe' then case when p_category='drink' then 'special_occasions' end
    when 'weekends' then case when p_category='drink' then 'weekends' end
    when 'ดื่มช่วงวันหยุด' then case when p_category='drink' then 'weekends' end
    when 'am wochenende' then case when p_category='drink' then 'weekends' end
    when 'regularly' then case when p_category in ('drink','smoke') then 'regularly' end
    when 'regelmäßig' then case when p_category in ('drink','smoke') then 'regularly' end
    when 'ดื่มเป็นประจำ' then case when p_category='drink' then 'regularly' end
    when 'สูบเป็นประจำ' then case when p_category='smoke' then 'regularly' end
    when 'sometimes' then case when p_category='smoke' then 'sometimes' end
    when 'สูบบางครั้ง' then case when p_category='smoke' then 'sometimes' end
    when 'manchmal' then case when p_category='smoke' then 'sometimes' end
    when 'quitting' then case when p_category='smoke' then 'quitting' end
    when 'กำลังเลิก' then case when p_category='smoke' then 'quitting' end
    when 'höre gerade auf' then case when p_category='smoke' then 'quitting' end

    -- exercise
    when 'ไม่ค่อยออก' then case when p_category='exercise' then 'rarely' end
    when '1_2_times_week' then case when p_category='exercise' then '1_2_times_week' end
    when '1–2 times/week' then case when p_category='exercise' then '1_2_times_week' end
    when '1-2 times/week' then case when p_category='exercise' then '1_2_times_week' end
    when 'สัปดาห์ละ 1–2 ครั้ง' then case when p_category='exercise' then '1_2_times_week' end
    when '1–2× pro woche' then case when p_category='exercise' then '1_2_times_week' end
    when '3_4_times_week' then case when p_category='exercise' then '3_4_times_week' end
    when '3–4 times/week' then case when p_category='exercise' then '3_4_times_week' end
    when '3-4 times/week' then case when p_category='exercise' then '3_4_times_week' end
    when 'สัปดาห์ละ 3–4 ครั้ง' then case when p_category='exercise' then '3_4_times_week' end
    when '3–4× pro woche' then case when p_category='exercise' then '3_4_times_week' end
    when 'almost_daily' then case when p_category='exercise' then 'almost_daily' end
    when 'almost daily' then case when p_category='exercise' then 'almost_daily' end
    when 'เกือบทุกวัน' then case when p_category='exercise' then 'almost_daily' end
    when 'fast täglich' then case when p_category='exercise' then 'almost_daily' end

    -- social
    when 'introvert' then case when p_category='social' then 'introvert' end
    when 'introvertiert' then case when p_category='social' then 'introvert' end
    when 'ambivert' then case when p_category='social' then 'ambivert' end
    when 'ambivertiert' then case when p_category='social' then 'ambivert' end
    when 'extrovert' then case when p_category='social' then 'extrovert' end
    when 'extrovertiert' then case when p_category='social' then 'extrovert' end

    -- interests
    when 'coffee' then case when p_category='interests' then 'coffee' end
    when 'kaffee' then case when p_category='interests' then 'coffee' end
    when 'travel' then case when p_category='interests' then 'travel' end
    when 'reisen' then case when p_category='interests' then 'travel' end
    when 'fitness' then case when p_category='interests' then 'fitness' end
    when 'foodie' then case when p_category='interests' then 'foodie' end
    when 'music' then case when p_category='interests' then 'music' end
    when 'musik' then case when p_category='interests' then 'music' end
    when 'pets' then case when p_category='interests' then 'pets' end
    when 'haustiere' then case when p_category='interests' then 'pets' end
    when 'art' then case when p_category='interests' then 'art' end
    when 'kunst' then case when p_category='interests' then 'art' end
    when 'beach' then case when p_category='interests' then 'beach' end
    when 'strand' then case when p_category='interests' then 'beach' end
    else null
  end;
$$;

create or replace function public.melo_lifestyle_array_v62(p_category text, p_values jsonb)
returns jsonb
language sql
immutable
as $$
  with raw as (
    select value, ord
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_values)='array' then p_values else '[]'::jsonb end
    ) with ordinality as x(value, ord)
  ), normalized as (
    select public.melo_lifestyle_value_v62(p_category, value) as value, min(ord) as ord
    from raw
    group by public.melo_lifestyle_value_v62(p_category, value)
  )
  select coalesce(jsonb_agg(value order by ord) filter (where value is not null), '[]'::jsonb)
  from normalized;
$$;

update public.profiles p
set lifestyle_preferences =
  (coalesce(p.lifestyle_preferences, '{}'::jsonb)
    - 'pet' - 'pets' - 'drink' - 'smoke' - 'exercise' - 'social' - 'interests')
  || jsonb_build_object(
    'pets', public.melo_lifestyle_array_v62(
      'pets',
      coalesce(p.lifestyle_preferences->'pets','[]'::jsonb) || coalesce(p.lifestyle_preferences->'pet','[]'::jsonb)
    ),
    'drink', public.melo_lifestyle_array_v62('drink', p.lifestyle_preferences->'drink'),
    'smoke', public.melo_lifestyle_array_v62('smoke', p.lifestyle_preferences->'smoke'),
    'exercise', public.melo_lifestyle_array_v62('exercise', p.lifestyle_preferences->'exercise'),
    'social', public.melo_lifestyle_array_v62('social', p.lifestyle_preferences->'social'),
    'interests', public.melo_lifestyle_array_v62('interests', p.lifestyle_preferences->'interests')
  )
where p.lifestyle_preferences is not null;

-- Migration helpers are no longer needed after existing rows are normalized.
drop function if exists public.melo_lifestyle_array_v62(text, jsonb);
drop function if exists public.melo_lifestyle_value_v62(text, text);
