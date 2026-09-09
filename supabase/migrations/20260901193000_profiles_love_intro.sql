-- Melo Chat Web - Love introduction
-- 2026-09-01
--
-- Love matching preferences already live on public.profiles in the current Web
-- implementation (relationship_goal, interested_genders, preferred age and
-- preferred nationalities), so Love introduction is kept with the same profile.

alter table public.profiles
  add column if not exists love_intro text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_love_intro_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_love_intro_length_check
      check (love_intro is null or char_length(love_intro) <= 500);
  end if;
end
$$;

comment on column public.profiles.love_intro is
  'User introduction shown in Melo Love / dating profile. Maximum 500 characters.';
