-- Melo Chat Lite: personal profile settings used by Settings > Personal profile.
begin;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists weight_kg numeric(5,2);
alter table public.profiles add column if not exists height_cm numeric(5,2);
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists education text;
alter table public.profiles add column if not exists marital_status text;
alter table public.profiles add column if not exists spoken_languages text[] not null default '{}'::text[];
alter table public.profiles add column if not exists relationship_type text;
alter table public.profiles add column if not exists sexual_orientation text;
alter table public.profiles add column if not exists lifestyle text;
commit;
notify pgrst, 'reload schema';
