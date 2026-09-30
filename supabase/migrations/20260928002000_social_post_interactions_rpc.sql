-- Melo Chat Lite: missing social post interaction RPCs used by the existing web UI.
-- Safe to run after 20260928001000_social_posts_and_profile_avatar_sync.sql.
begin;

create or replace function public.toggle_social_post_like(p_post_id uuid)
returns table(is_liked boolean, like_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.social_posts where id = p_post_id) then
    raise exception 'Post not found';
  end if;

  if exists (select 1 from public.social_post_likes where post_id=p_post_id and user_id=v_uid) then
    delete from public.social_post_likes where post_id=p_post_id and user_id=v_uid;
    v_liked := false;
  else
    insert into public.social_post_likes(post_id,user_id) values(p_post_id,v_uid)
    on conflict (post_id,user_id) do nothing;
    v_liked := true;
  end if;

  return query
  select v_liked, count(*)::bigint from public.social_post_likes where post_id=p_post_id;
end $$;

create or replace function public.toggle_social_post_save(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.social_posts where id = p_post_id) then
    raise exception 'Post not found';
  end if;

  if exists (select 1 from public.social_post_saves where post_id=p_post_id and user_id=v_uid) then
    delete from public.social_post_saves where post_id=p_post_id and user_id=v_uid;
    return false;
  end if;

  insert into public.social_post_saves(post_id,user_id) values(p_post_id,v_uid)
  on conflict (post_id,user_id) do nothing;
  return true;
end $$;

create or replace function public.get_social_post_comments(p_post_id uuid)
returns table(
  id uuid,
  post_id uuid,
  parent_comment_id uuid,
  author_id uuid,
  author_name text,
  author_photo_path text,
  body text,
  can_delete boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.post_id,
    c.parent_comment_id,
    c.author_id,
    coalesce(nullif(p.first_name,''), nullif(p.display_name,''), 'Melo member') as author_name,
    coalesce(p.photo_paths[1], '') as author_photo_path,
    c.body,
    c.author_id = auth.uid() as can_delete,
    c.created_at
  from public.social_post_comments c
  left join public.profiles p on p.id = c.author_id
  where c.post_id = p_post_id
  order by c.created_at asc;
$$;

create or replace function public.create_social_post_comment(
  p_post_id uuid,
  p_body text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(coalesce(p_body,'')),'') is null then raise exception 'Comment is empty'; end if;
  if not exists (select 1 from public.social_posts where id=p_post_id) then raise exception 'Post not found'; end if;

  insert into public.social_post_comments(post_id,author_id,parent_comment_id,body)
  values(p_post_id,auth.uid(),p_parent_comment_id,trim(p_body))
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.toggle_social_post_like(uuid) to authenticated;
grant execute on function public.toggle_social_post_save(uuid) to authenticated;
grant execute on function public.get_social_post_comments(uuid) to authenticated;
grant execute on function public.create_social_post_comment(uuid,text,uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
