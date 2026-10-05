-- Melo Chat Lite V43 — real profile discovery + Connect data on the fresh Supabase project.
begin;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists interests text[] not null default '{}'::text[];
alter table public.profiles add column if not exists relationship_goal text;
alter table public.profiles add column if not exists interested_genders text[] not null default '{}'::text[];
alter table public.profiles add column if not exists preferred_age_min integer not null default 18;
alter table public.profiles add column if not exists preferred_age_max integer not null default 80;
alter table public.profiles add column if not exists preferred_nationalities text[] not null default '{}'::text[];
alter table public.profiles add column if not exists drinking text;
alter table public.profiles add column if not exists smoking text;
alter table public.profiles add column if not exists exercise text;
alter table public.profiles add column if not exists pets text;
alter table public.profiles add column if not exists is_active boolean not null default true;

-- A dating profile must be discoverable by other signed-in users. Updates remain own-row only.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select to authenticated
using (is_active = true or id = auth.uid());

create table if not exists public.profile_likes (
  liker_id uuid not null references auth.users(id) on delete cascade,
  liked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_user_id),
  check (liker_id <> liked_user_id)
);

create table if not exists public.profile_favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  favorite_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, favorite_user_id),
  check (owner_id <> favorite_user_id)
);

create table if not exists public.profile_matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  matched_at timestamptz not null default now(),
  check (user_a_id <> user_b_id)
);
create unique index if not exists profile_matches_pair_unique
on public.profile_matches (least(user_a_id,user_b_id), greatest(user_a_id,user_b_id));

alter table public.profile_likes enable row level security;
alter table public.profile_favorites enable row level security;
alter table public.profile_matches enable row level security;

drop policy if exists "profile_likes_read_related" on public.profile_likes;
create policy "profile_likes_read_related" on public.profile_likes for select to authenticated
using (liker_id=auth.uid() or liked_user_id=auth.uid());
drop policy if exists "profile_likes_write_own" on public.profile_likes;
create policy "profile_likes_write_own" on public.profile_likes for insert to authenticated
with check (liker_id=auth.uid());
drop policy if exists "profile_likes_delete_own" on public.profile_likes;
create policy "profile_likes_delete_own" on public.profile_likes for delete to authenticated
using (liker_id=auth.uid());

drop policy if exists "profile_favorites_read_own" on public.profile_favorites;
create policy "profile_favorites_read_own" on public.profile_favorites for select to authenticated using (owner_id=auth.uid());
drop policy if exists "profile_favorites_write_own" on public.profile_favorites;
create policy "profile_favorites_write_own" on public.profile_favorites for insert to authenticated with check (owner_id=auth.uid());
drop policy if exists "profile_favorites_delete_own" on public.profile_favorites;
create policy "profile_favorites_delete_own" on public.profile_favorites for delete to authenticated using (owner_id=auth.uid());

drop policy if exists "profile_matches_read_related" on public.profile_matches;
create policy "profile_matches_read_related" on public.profile_matches for select to authenticated
using (user_a_id=auth.uid() or user_b_id=auth.uid());

commit;
notify pgrst, 'reload schema';
