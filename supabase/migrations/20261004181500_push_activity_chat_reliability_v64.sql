-- Melo Chat Lite V64 — Activity Push + every Direct Chat message reliability
-- Safe to re-run. Creates canonical notification rows directly so the V62
-- public.notifications dispatcher can deliver them while the site is closed.

begin;

create or replace function public.melo_actor_name_v64(p_user uuid)
returns text
language sql
stable
security definer
set search_path=public,auth
as $$
  select coalesce(
    nullif(trim(concat_ws(' ',to_jsonb(p)->>'first_name',to_jsonb(p)->>'last_name')),''),
    nullif(to_jsonb(p)->>'display_name',''),
    nullif(u.raw_user_meta_data->>'full_name',''),
    split_part(u.email,'@',1),
    'Melo member'
  )
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=p_user
  limit 1
$$;
revoke all on function public.melo_actor_name_v64(uuid) from public;

create or replace function public.melo_activity_insert_v64(
  p_recipient uuid,
  p_type text,
  p_actor uuid,
  p_entity uuid,
  p_body text,
  p_href text,
  p_created_at timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_recipient is null or p_actor is null or p_recipient=p_actor then return false; end if;
  insert into public.notifications(user_id,type,actor_id,entity_id,title,body,href,is_read,metadata,created_at)
  values(
    p_recipient,p_type,p_actor,p_entity,'Melo Chat',p_body,p_href,false,
    jsonb_build_object('type',p_type,'actor_id',p_actor,'entity_id',p_entity,'href',p_href,'activity_notification',true),
    coalesce(p_created_at,now())
  );
  return true;
exception when others then
  raise warning 'melo_activity_insert_v64 failed [%]: %',p_type,sqlerrm;
  return false;
end;
$$;
revoke all on function public.melo_activity_insert_v64(uuid,text,uuid,uuid,text,text,timestamptz) from public;

create or replace function public.melo_follow_push_v64()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.melo_activity_insert_v64(
    new.followed_user_id,'profile_follow',new.follower_id,new.follower_id,
    public.melo_actor_name_v64(new.follower_id)||' started following you',
    '/profile?user='||new.follower_id::text,new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_profile_follow_notify_v63_trg on public.profile_follows;
drop trigger if exists melo_profile_follow_notify_v64_trg on public.profile_follows;
create trigger melo_profile_follow_notify_v64_trg after insert on public.profile_follows
for each row execute function public.melo_follow_push_v64();

create or replace function public.melo_interest_push_v64()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.melo_activity_insert_v64(
    new.liked_user_id,'profile_interest',new.liker_id,new.liker_id,
    public.melo_actor_name_v64(new.liker_id)||' is interested in you',
    '/connect',new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_profile_like_notify_v63_trg on public.profile_likes;
drop trigger if exists melo_profile_like_notify_v64_trg on public.profile_likes;
create trigger melo_profile_like_notify_v64_trg after insert on public.profile_likes
for each row execute function public.melo_interest_push_v64();

create or replace function public.melo_match_push_v64()
returns trigger language plpgsql security definer set search_path=public as $$
declare a text; b text;
begin
  a:=public.melo_actor_name_v64(new.user_a_id);
  b:=public.melo_actor_name_v64(new.user_b_id);
  perform public.melo_activity_insert_v64(new.user_a_id,'profile_match',new.user_b_id,new.id,'You matched with '||b,'/connect',new.matched_at);
  perform public.melo_activity_insert_v64(new.user_b_id,'profile_match',new.user_a_id,new.id,'You matched with '||a,'/connect',new.matched_at);
  return new;
end $$;
drop trigger if exists melo_profile_match_notify_v63_trg on public.profile_matches;
drop trigger if exists melo_profile_match_notify_v64_trg on public.profile_matches;
create trigger melo_profile_match_notify_v64_trg after insert on public.profile_matches
for each row execute function public.melo_match_push_v64();

create or replace function public.melo_post_like_push_v64()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.social_posts where id=new.post_id;
  if owner_id is null or owner_id=new.user_id then return new; end if;
  perform public.melo_activity_insert_v64(
    owner_id,'post_like',new.user_id,new.post_id,
    public.melo_actor_name_v64(new.user_id)||' liked your post',
    '/feed?post='||new.post_id::text,new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_post_like_notify_v63_trg on public.social_post_likes;
drop trigger if exists melo_post_like_notify_v64_trg on public.social_post_likes;
create trigger melo_post_like_notify_v64_trg after insert on public.social_post_likes
for each row execute function public.melo_post_like_push_v64();

create or replace function public.melo_post_comment_push_v64()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; preview text;
begin
  select author_id into owner_id from public.social_posts where id=new.post_id;
  if owner_id is null or owner_id=new.author_id then return new; end if;
  preview:=left(regexp_replace(coalesce(new.body,''),'[\n\r]+',' ','g'),120);
  perform public.melo_activity_insert_v64(
    owner_id,'post_comment',new.author_id,new.id,
    public.melo_actor_name_v64(new.author_id)||' commented: '||preview,
    '/feed?post='||new.post_id::text,new.created_at
  );
  return new;
end $$;
drop trigger if exists melo_post_comment_notify_v63_trg on public.social_post_comments;
drop trigger if exists melo_post_comment_notify_v64_trg on public.social_post_comments;
create trigger melo_post_comment_notify_v64_trg after insert on public.social_post_comments
for each row execute function public.melo_post_comment_push_v64();

-- Re-attach the proven Direct Chat producer so every inserted message gets its
-- own canonical notification row. The message UUID is the entity UUID, so no
-- two messages collapse into one notification.
do $$
declare v_table text;
begin
  if to_regprocedure('public.melo_direct_message_notification_v47()') is null then
    raise warning 'Melo V64: direct-message producer V47 is missing';
    return;
  end if;
  foreach v_table in array array['chat_messages','messages'] loop
    if to_regclass('public.'||v_table) is null then continue; end if;
    execute format('drop trigger if exists melo_direct_message_notification_v42_trg on public.%I',v_table);
    execute format('drop trigger if exists melo_direct_message_notification_v43 on public.%I',v_table);
    execute format('drop trigger if exists melo_direct_message_notification_v47_trg on public.%I',v_table);
    execute format('create trigger melo_direct_message_notification_v47_trg after insert on public.%I for each row execute function public.melo_direct_message_notification_v47()',v_table);
  end loop;
end $$;

commit;
notify pgrst, 'reload schema';
