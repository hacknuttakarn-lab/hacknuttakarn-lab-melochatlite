-- Melo Chat Lite V13 — Home Profile Boost
-- Foundation only: package/monthly quota enforcement will be added later.

alter table public.profiles
  add column if not exists profile_boosted_at timestamptz null;

create index if not exists profiles_home_discovery_rank_idx
  on public.profiles ((coalesce(profile_boosted_at, created_at)) desc, created_at desc);

create table if not exists public.profile_boost_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boosted_at timestamptz not null default now()
);

create index if not exists profile_boost_events_user_time_idx
  on public.profile_boost_events (user_id, boosted_at desc);

alter table public.profile_boost_events enable row level security;

drop policy if exists "profile_boost_events_select_own" on public.profile_boost_events;
create policy "profile_boost_events_select_own"
  on public.profile_boost_events
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.boost_my_profile()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_boosted_at timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
     set profile_boosted_at = v_boosted_at,
         updated_at = now()
   where id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  insert into public.profile_boost_events(user_id, boosted_at)
  values (v_user_id, v_boosted_at);

  return v_boosted_at;
end;
$$;

revoke all on function public.boost_my_profile() from public;
grant execute on function public.boost_my_profile() to authenticated;
