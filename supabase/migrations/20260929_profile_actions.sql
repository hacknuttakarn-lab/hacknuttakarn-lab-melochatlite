-- Melo Chat Lite: Supabase source-of-truth for Interested / Follow / Pass
-- Run once in Supabase SQL Editor.

create table if not exists public.profile_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_user_id),
  constraint profile_follows_not_self check (follower_id <> followed_user_id)
);

alter table public.profile_follows enable row level security;
drop policy if exists "profile_follows_select_own" on public.profile_follows;
create policy "profile_follows_select_own" on public.profile_follows for select to authenticated
using (follower_id = auth.uid() or followed_user_id = auth.uid());
drop policy if exists "profile_follows_insert_own" on public.profile_follows;
create policy "profile_follows_insert_own" on public.profile_follows for insert to authenticated
with check (follower_id = auth.uid());
drop policy if exists "profile_follows_delete_own" on public.profile_follows;
create policy "profile_follows_delete_own" on public.profile_follows for delete to authenticated
using (follower_id = auth.uid());

create table if not exists public.profile_passes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  passed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, passed_user_id),
  constraint profile_passes_not_self check (owner_id <> passed_user_id)
);

alter table public.profile_passes enable row level security;
drop policy if exists "profile_passes_select_own" on public.profile_passes;
create policy "profile_passes_select_own" on public.profile_passes for select to authenticated using (owner_id = auth.uid());
drop policy if exists "profile_passes_insert_own" on public.profile_passes;
create policy "profile_passes_insert_own" on public.profile_passes for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "profile_passes_delete_own" on public.profile_passes;
create policy "profile_passes_delete_own" on public.profile_passes for delete to authenticated using (owner_id = auth.uid());

create or replace function public.set_profile_like(p_target_user_id uuid, p_liked boolean)
returns table(is_match boolean, match_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_match_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_target_user_id is null or p_target_user_id = v_uid then raise exception 'Invalid target user'; end if;

  if p_liked then
    delete from public.profile_passes where owner_id = v_uid and passed_user_id = p_target_user_id;
    insert into public.profile_likes(liker_id, liked_user_id)
    values (v_uid, p_target_user_id)
    on conflict (liker_id, liked_user_id) do nothing;

    if exists(select 1 from public.profile_likes where liker_id = p_target_user_id and liked_user_id = v_uid) then
      v_a := least(v_uid, p_target_user_id);
      v_b := greatest(v_uid, p_target_user_id);
      perform pg_advisory_xact_lock(hashtextextended(v_a::text || ':' || v_b::text, 0));
      select id into v_match_id from public.profile_matches
       where (user_a_id = v_a and user_b_id = v_b) or (user_a_id = v_b and user_b_id = v_a)
       order by matched_at asc limit 1;
      if v_match_id is null then
        insert into public.profile_matches(user_a_id, user_b_id) values (v_a, v_b) returning id into v_match_id;
      end if;
      return query select true, v_match_id;
      return;
    end if;
  else
    delete from public.profile_likes where liker_id = v_uid and liked_user_id = p_target_user_id;
  end if;
  return query select false, null::uuid;
end;
$$;

create or replace function public.set_profile_follow(p_target_user_id uuid, p_following boolean)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_target_user_id is null or p_target_user_id = v_uid then raise exception 'Invalid target user'; end if;
  if p_following then
    insert into public.profile_follows(follower_id, followed_user_id) values(v_uid, p_target_user_id)
    on conflict (follower_id, followed_user_id) do nothing;
  else
    delete from public.profile_follows where follower_id = v_uid and followed_user_id = p_target_user_id;
  end if;
  return p_following;
end;
$$;

create or replace function public.set_profile_pass(p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_target_user_id is null or p_target_user_id = v_uid then raise exception 'Invalid target user'; end if;
  delete from public.profile_likes where liker_id = v_uid and liked_user_id = p_target_user_id;
  insert into public.profile_passes(owner_id, passed_user_id) values(v_uid, p_target_user_id)
  on conflict (owner_id, passed_user_id) do nothing;
  return true;
end;
$$;

grant execute on function public.set_profile_like(uuid, boolean) to authenticated;
grant execute on function public.set_profile_follow(uuid, boolean) to authenticated;
grant execute on function public.set_profile_pass(uuid) to authenticated;
