alter table public.profiles
  add column if not exists gender text;

comment on column public.profiles.gender is
  'User self-described gender used by Melo Chat Lite onboarding/profile settings.';
