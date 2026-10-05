-- Melo Chat Lite V63
-- 1) Produce canonical public.notifications rows for member activities that were
--    previously visible only while the site was open: profile follow/interest,
--    match, post like, post comment.
-- 2) Keep every chat message as a distinct notification row. V62 then dispatches
--    every row to Web Push.

begin;

create or replace function public.melo_actor_name_v63(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare v_name text;
begin
  select coalesce(
    nullif(trim(concat_ws(' ',to_jsonb(p)->>'first_name',to_jsonb(p)->>'last_name')),''),
    nullif(to_jsonb(p)->>'display_name',''),
    nullif(u.raw_user_meta_data->>'full_name',''),
    split_part(u.email,'@',1),
    'Melo member'
  ) into v_name
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=p_user;
  return coalesce(v_name,'Melo member');
exception when others then return 'Melo member';
end;
$$;
revoke all on function public.melo_actor_name_v63(uuid) from public;

create or replace function public.melo_activity_notify_v63(
  p_recipient uuid,
  p_type text,
  p_actor uuid,
  p_entity uuid,
  p_title text,
  p_body text,
  p_href text,
  p_metadata jsonb default '{}'::jsonb,
  p_created_at timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_recipient is null or p_actor is null or p_recipient=p_actor then return false; end if;
  return public.melo_insert_notification_compat(
    p_recipient,p_type,p_actor,p_entity,p_title,p_body,p_href,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('activity_notification',true,'href',p_href),
    coalesce(p_created_at,now())
  );
exception when others then
  raise warning 'melo_activity_notify_v63 failed: %',sqlerrm;
  return false;
end;
$$;
revoke all on function public.melo_activity_notify_v63(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz) from public;

-- Profile Follow
create or replace function public.melo_profile_follow_notify_v63()
returns trigger language plpgsql security definer set search_path=public as $$
declare n text;
begin
  n:=public.melo_actor_name_v63(new.follower_id);
  perform public.melo_activity_notify_v63(
    new.followed_user_id,'profile_follow',new.follower_id,new.follower_id,
    'Melo Chat',n||' started following you','/profile?user='||new.follower_id::text,
    jsonb_build_object('actor_id',new.follower_id,'followed_user_id',new.followed_user_id),new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_profile_follow_notify_v63_trg on public.profile_follows;
create trigger melo_profile_follow_notify_v63_trg after insert on public.profile_follows
for each row execute function public.melo_profile_follow_notify_v63();

-- Profile Interest / Like
create or replace function public.melo_profile_like_notify_v63()
returns trigger language plpgsql security definer set search_path=public as $$
declare n text;
begin
  n:=public.melo_actor_name_v63(new.liker_id);
  perform public.melo_activity_notify_v63(
    new.liked_user_id,'profile_interest',new.liker_id,new.liker_id,
    'Melo Chat',n||' is interested in you','/connect',
    jsonb_build_object('actor_id',new.liker_id,'liked_user_id',new.liked_user_id),new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_profile_like_notify_v63_trg on public.profile_likes;
create trigger melo_profile_like_notify_v63_trg after insert on public.profile_likes
for each row execute function public.melo_profile_like_notify_v63();

-- Match: notify both members once when a match row is created.
create or replace function public.melo_profile_match_notify_v63()
returns trigger language plpgsql security definer set search_path=public as $$
declare a text; b text;
begin
  a:=public.melo_actor_name_v63(new.user_a_id);
  b:=public.melo_actor_name_v63(new.user_b_id);
  perform public.melo_activity_notify_v63(
    new.user_a_id,'profile_match',new.user_b_id,new.id,
    'Melo Chat','You matched with '||b,'/connect',
    jsonb_build_object('match_id',new.id,'actor_id',new.user_b_id),new.matched_at
  );
  perform public.melo_activity_notify_v63(
    new.user_b_id,'profile_match',new.user_a_id,new.id,
    'Melo Chat','You matched with '||a,'/connect',
    jsonb_build_object('match_id',new.id,'actor_id',new.user_a_id),new.matched_at
  );
  return new;
end $$;
drop trigger if exists melo_profile_match_notify_v63_trg on public.profile_matches;
create trigger melo_profile_match_notify_v63_trg after insert on public.profile_matches
for each row execute function public.melo_profile_match_notify_v63();

-- Post Like
create or replace function public.melo_post_like_notify_v63()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; n text;
begin
  select author_id into owner_id from public.social_posts where id=new.post_id;
  if owner_id is null or owner_id=new.user_id then return new; end if;
  n:=public.melo_actor_name_v63(new.user_id);
  perform public.melo_activity_notify_v63(
    owner_id,'post_like',new.user_id,new.post_id,
    'Melo Chat',n||' liked your post','/feed?post='||new.post_id::text,
    jsonb_build_object('post_id',new.post_id,'actor_id',new.user_id),new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_post_like_notify_v63_trg on public.social_post_likes;
create trigger melo_post_like_notify_v63_trg after insert on public.social_post_likes
for each row execute function public.melo_post_like_notify_v63();

-- Post Comment
create or replace function public.melo_post_comment_notify_v63()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; n text; preview text;
begin
  select author_id into owner_id from public.social_posts where id=new.post_id;
  if owner_id is null or owner_id=new.author_id then return new; end if;
  n:=public.melo_actor_name_v63(new.author_id);
  preview:=left(regexp_replace(coalesce(new.body,''),'[\n\r]+',' ','g'),120);
  perform public.melo_activity_notify_v63(
    owner_id,'post_comment',new.author_id,new.id,
    'Melo Chat',n||' commented: '||preview,'/feed?post='||new.post_id::text,
    jsonb_build_object('post_id',new.post_id,'comment_id',new.id,'actor_id',new.author_id),new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_post_comment_notify_v63_trg on public.social_post_comments;
create trigger melo_post_comment_notify_v63_trg after insert on public.social_post_comments
for each row execute function public.melo_post_comment_notify_v63();

commit;
notify pgrst, 'reload schema';
