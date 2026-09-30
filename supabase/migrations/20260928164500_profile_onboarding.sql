-- Melo Chat Lite V39: require profile onboarding after email verification.
begin;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists onboarding_step smallint not null default 1;
-- Existing accounts predate this onboarding flow; do not lock them out.
update public.profiles set onboarding_completed = true, onboarding_step = 3 where created_at < now() - interval '5 minutes';
commit;
notify pgrst, 'reload schema';
