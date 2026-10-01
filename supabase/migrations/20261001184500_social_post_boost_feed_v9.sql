begin;

-- Melo Chat Lite V9
-- Keep the existing get_social_feed contract untouched and expose an explicit
-- boost-aware feed RPC. This avoids PostgREST resolving an older overload/cache
-- and guarantees boosted_at participates in the feed order.

alter table public.social_posts
  add column if not exists boosted_at timestamptz null;

create index if not exists social_posts_feed_boost_idx
  on public.social_posts ((coalesce(boosted_at, created_at)) desc, created_at desc);

create or replace function public.boost_social_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.social_posts
     set boosted_at = clock_timestamp()
   where id = p_post_id
     and author_id = auth.uid();

  if not found then
    raise exception 'Post not found or not permitted';
  end if;

  return true;
end;
$$;

revoke all on function public.boost_social_post(uuid) from public;
grant execute on function public.boost_social_post(uuid) to authenticated;

create or replace function public.get_social_feed_boosted(
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
set search_path = public
as $$
 select
   p.id,
   p.author_id,
   p.body,
   p.visibility,
   p.image_paths,
   p.location_name,
   p.latitude,
   p.longitude,
   p.activity_type,
   p.activity_id,
   p.activity_title,
   p.activity_subtitle,
   p.activity_image_path,
   (select count(*) from public.social_post_likes l where l.post_id=p.id),
   (select count(*) from public.social_post_comments c where c.post_id=p.id),
   0::bigint,
   exists(select 1 from public.social_post_likes l where l.post_id=p.id and l.user_id=auth.uid()),
   exists(select 1 from public.social_post_saves s where s.post_id=p.id and s.user_id=auth.uid()),
   p.author_id=auth.uid(),
   p.created_at,
   p.updated_at,
   p.boosted_at
 from public.social_posts p
 where (p_post_id is null or p.id=p_post_id)
   and (p_author_id is null or p.author_id=p_author_id)
   and (not p_saved_only or exists(select 1 from public.social_post_saves s where s.post_id=p.id and s.user_id=auth.uid()))
   and (
     p.author_id=auth.uid()
     or p.visibility='public'
     or (p.visibility='friends' and auth.uid()=any(p.audience_user_ids))
   )
 order by coalesce(p.boosted_at,p.created_at) desc, p.created_at desc
 limit greatest(1,least(coalesce(p_limit,30),50))
 offset greatest(coalesce(p_offset,0),0);
$$;

revoke all on function public.get_social_feed_boosted(integer,integer,uuid,boolean,uuid) from public;
grant execute on function public.get_social_feed_boosted(integer,integer,uuid,boolean,uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
