-- Melo Chat Lite: structured profile preferences for smarter matching.
begin;
alter table public.profiles add column if not exists looking_for text[] not null default '{}'::text[];
alter table public.profiles add column if not exists sexual_orientations text[] not null default '{}'::text[];
alter table public.profiles add column if not exists lifestyle_preferences jsonb not null default '{}'::jsonb;
commit;
notify pgrst, 'reload schema';
