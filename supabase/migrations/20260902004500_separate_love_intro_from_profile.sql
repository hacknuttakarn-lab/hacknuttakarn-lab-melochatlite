-- Melo Chat Web
-- Separate Love introduction from the normal profile About me.
-- Idempotent: safe to run when love_intro already exists.

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
      check (
        love_intro is null
        or char_length(love_intro) <= 500
      );
  end if;
end
$$;

comment on column public.profiles.love_intro is
  'Love-only introduction. Independent from the normal profile bio/about. Maximum 500 characters.';

-- Deliberately DO NOT copy profile.bio/about into love_intro.
-- Existing About me remains unchanged and Love intro starts independently.
