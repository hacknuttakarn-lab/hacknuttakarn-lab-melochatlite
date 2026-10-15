-- Melo Chat Lite V48
-- 1) Identity verification is a badge only: pending/unverified members remain discoverable.
-- 2) Public feed visibility does not depend on identity verification.
-- Safe to apply on top of the existing Lite schema.

begin;

-- Keep profile reads available to signed-in members. Verification state is NOT
-- part of this policy. Suspended/inactive rows remain hidden from other users.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select to authenticated
using (coalesce(is_active, true) = true or id = auth.uid());

-- Dedicated Home discovery RPC so stale legacy dating RPCs cannot accidentally
-- gate users by verification status. A row becomes discoverable once it contains
-- meaningful profile information; verification_requests is deliberately unused.
create or replace function public.get_lite_home_profiles_v48(p_limit integer default 100)
returns setof public.profiles
language sql
security definer
set search_path = public, auth
as $$
  select p.*
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and coalesce(p.is_active, true) = true
    and (
      coalesce(p.onboarding_completed, false) = true
      or nullif(trim(coalesce(p.first_name, '')), '') is not null
      or nullif(trim(coalesce(p.display_name, '')), '') is not null
      or cardinality(coalesce(p.photo_paths, '{}'::text[])) > 0
    )
  order by coalesce(p.profile_boosted_at, p.created_at) desc, p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

revoke all on function public.get_lite_home_profiles_v48(integer) from public;
grant execute on function public.get_lite_home_profiles_v48(integer) to authenticated;

-- Dedicated feed RPC with the same visibility rules as the current boosted feed,
-- but explicitly independent of verification_requests / verified badge status.
create or replace function public.get_social_feed_v48(
  p_limit integer default 30,
  p_offset integer default 0,
  p_author_id uuid default null,
  p_saved_only boolean default false,
  p_post_id uuid default null
)
returns table(
  id uuid,
  author_id uuid,
  body text,
  visibility text,
  image_paths text[],
  location_name text,
  latitude double precision,
  longitude double precision,
  activity_type text,
  activity_id uuid,
  activity_title text,
  activity_subtitle text,
  activity_image_path text,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  is_liked boolean,
  is_saved boolean,
  can_manage boolean,
  created_at timestamptz,
  updated_at timestamptz,
  boosted_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id,
    p.author_id,
    p.body,
    p.visibility::text,
    p.image_paths,
    p.location_name,
    p.latitude,
    p.longitude,
    p.activity_type::text,
    p.activity_id,
    p.activity_title,
    p.activity_subtitle,
    p.activity_image_path,
    (select count(*) from public.social_post_likes l where l.post_id = p.id),
    (select count(*) from public.social_post_comments c where c.post_id = p.id),
    0::bigint,
    exists(select 1 from public.social_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    exists(select 1 from public.social_post_saves s where s.post_id = p.id and s.user_id = auth.uid()),
    p.author_id = auth.uid(),
    p.created_at,
    p.updated_at,
    p.boosted_at
  from public.social_posts p
  where auth.uid() is not null
    and (p_post_id is null or p.id = p_post_id)
    and (p_author_id is null or p.author_id = p_author_id)
    and (
      not p_saved_only
      or exists(select 1 from public.social_post_saves s where s.post_id = p.id and s.user_id = auth.uid())
    )
    and (
      p.author_id = auth.uid()
      or p.visibility::text = 'public'
      or (p.visibility::text = 'friends' and auth.uid() = any(p.audience_user_ids))
    )
  order by
    (
      extract(epoch from coalesce(p.boosted_at, p.created_at))
      + case
          when p.boosted_at is not null then coalesce((
            select pl.boost_priority
            from public.user_subscriptions us
            join public.subscription_plans pl on pl.id = us.plan_id
            where us.user_id = p.author_id
              and us.status = 'active'
              and (us.expires_at is null or us.expires_at > now())
            order by us.starts_at desc
            limit 1
          ), 0) * 3600
          else 0
        end
    ) desc,
    p.created_at desc,
    p.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_social_feed_v48(integer,integer,uuid,boolean,uuid) from public;
grant execute on function public.get_social_feed_v48(integer,integer,uuid,boolean,uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
