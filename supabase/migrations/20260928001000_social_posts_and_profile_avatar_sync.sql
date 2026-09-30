-- Melo Chat Lite — fresh Supabase social posts + media storage.
-- Adds only the persistence required by the existing web social feed/profile composer.
begin;

-- Columns already referenced by the existing web profile/feed readers.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists nationality text;
alter table public.profiles add column if not exists primary_language text;

-- Populate a sensible display name for existing auth users without changing an existing value.
update public.profiles p
set display_name = coalesce(nullif(u.raw_user_meta_data->>'display_name',''), nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1), 'Melo member')
from auth.users u
where p.id=u.id and nullif(p.display_name,'') is null;

-- Authenticated Melo members need to resolve author names/photos in feeds.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
for select to authenticated using (true);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  visibility text not null default 'public' check (visibility in ('public','friends','trip_members','event_participants','community_members','only_me')),
  image_paths text[] not null default '{}'::text[],
  location_name text,
  latitude double precision,
  longitude double precision,
  activity_type text,
  activity_id uuid,
  activity_title text,
  activity_subtitle text,
  activity_image_path text,
  audience_user_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_posts_author_created_idx on public.social_posts(author_id, created_at desc);

create table if not exists public.social_post_titles (
  post_id uuid primary key references public.social_posts(id) on delete cascade,
  title text check (char_length(title) <= 120)
);
create table if not exists public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.social_post_saves (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.social_post_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.social_posts enable row level security;
alter table public.social_post_titles enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_post_saves enable row level security;
alter table public.social_post_comments enable row level security;

-- Direct table access remains conservative; app mutations use security-definer RPCs below.
drop policy if exists "social_posts_read_authenticated" on public.social_posts;
create policy "social_posts_read_authenticated" on public.social_posts for select to authenticated using (true);
drop policy if exists "social_titles_read_authenticated" on public.social_post_titles;
create policy "social_titles_read_authenticated" on public.social_post_titles for select to authenticated using (true);
drop policy if exists "social_likes_read_authenticated" on public.social_post_likes;
create policy "social_likes_read_authenticated" on public.social_post_likes for select to authenticated using (true);
drop policy if exists "social_saves_read_own" on public.social_post_saves;
create policy "social_saves_read_own" on public.social_post_saves for select to authenticated using (user_id=auth.uid());
drop policy if exists "social_comments_read_authenticated" on public.social_post_comments;
create policy "social_comments_read_authenticated" on public.social_post_comments for select to authenticated using (true);

create or replace function public.create_social_post(
 p_body text, p_visibility text, p_image_paths text[], p_location_name text,
 p_latitude double precision, p_longitude double precision, p_activity_type text,
 p_activity_id uuid, p_activity_title text, p_activity_subtitle text,
 p_activity_image_path text, p_audience_user_ids uuid[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.social_posts(author_id,body,visibility,image_paths,location_name,latitude,longitude,activity_type,activity_id,activity_title,activity_subtitle,activity_image_path,audience_user_ids)
 values(auth.uid(),coalesce(p_body,''),coalesce(p_visibility,'public'),coalesce(p_image_paths,'{}'),p_location_name,p_latitude,p_longitude,p_activity_type,p_activity_id,p_activity_title,p_activity_subtitle,p_activity_image_path,coalesce(p_audience_user_ids,'{}')) returning id into v_id;
 return v_id;
end $$;

create or replace function public.update_social_post(
 p_post_id uuid, p_body text, p_visibility text, p_image_paths text[], p_location_name text,
 p_latitude double precision, p_longitude double precision, p_activity_type text,
 p_activity_id uuid, p_activity_title text, p_activity_subtitle text,
 p_activity_image_path text, p_audience_user_ids uuid[]
) returns uuid language plpgsql security definer set search_path=public as $$
begin
 update public.social_posts set body=coalesce(p_body,''),visibility=coalesce(p_visibility,'public'),image_paths=coalesce(p_image_paths,'{}'),location_name=p_location_name,latitude=p_latitude,longitude=p_longitude,activity_type=p_activity_type,activity_id=p_activity_id,activity_title=p_activity_title,activity_subtitle=p_activity_subtitle,activity_image_path=p_activity_image_path,audience_user_ids=coalesce(p_audience_user_ids,'{}'),updated_at=now()
 where id=p_post_id and author_id=auth.uid();
 if not found then raise exception 'Post not found or not permitted'; end if;
 return p_post_id;
end $$;

create or replace function public.delete_social_post(p_post_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin delete from public.social_posts where id=p_post_id and author_id=auth.uid(); return found; end $$;

create or replace function public.set_social_post_title(p_post_id uuid,p_title text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.social_posts where id=p_post_id and author_id=auth.uid()) then raise exception 'Post not found or not permitted'; end if;
 if nullif(trim(coalesce(p_title,'')),'') is null then delete from public.social_post_titles where post_id=p_post_id;
 else insert into public.social_post_titles(post_id,title) values(p_post_id,left(trim(p_title),120)) on conflict(post_id) do update set title=excluded.title; end if;
 return true;
end $$;

create or replace function public.get_social_post_titles(p_post_ids uuid[])
returns table(post_id uuid,title text) language sql security definer set search_path=public as $$
 select t.post_id,t.title from public.social_post_titles t where t.post_id=any(coalesce(p_post_ids,'{}'::uuid[]));
$$;

create or replace function public.get_social_feed(p_limit integer default 30,p_offset integer default 0,p_author_id uuid default null,p_saved_only boolean default false,p_post_id uuid default null)
returns table(id uuid,author_id uuid,body text,visibility text,image_paths text[],location_name text,latitude double precision,longitude double precision,activity_type text,activity_id uuid,activity_title text,activity_subtitle text,activity_image_path text,like_count bigint,comment_count bigint,share_count bigint,is_liked boolean,is_saved boolean,can_manage boolean,created_at timestamptz,updated_at timestamptz)
language sql security definer set search_path=public as $$
 select p.id,p.author_id,p.body,p.visibility,p.image_paths,p.location_name,p.latitude,p.longitude,p.activity_type,p.activity_id,p.activity_title,p.activity_subtitle,p.activity_image_path,
   (select count(*) from public.social_post_likes l where l.post_id=p.id),
   (select count(*) from public.social_post_comments c where c.post_id=p.id),
   0::bigint,
   exists(select 1 from public.social_post_likes l where l.post_id=p.id and l.user_id=auth.uid()),
   exists(select 1 from public.social_post_saves s where s.post_id=p.id and s.user_id=auth.uid()),
   p.author_id=auth.uid(),p.created_at,p.updated_at
 from public.social_posts p
 where (p_post_id is null or p.id=p_post_id)
   and (p_author_id is null or p.author_id=p_author_id)
   and (not p_saved_only or exists(select 1 from public.social_post_saves s where s.post_id=p.id and s.user_id=auth.uid()))
   and (p.author_id=auth.uid() or p.visibility='public' or (p.visibility='friends' and auth.uid()=any(p.audience_user_ids)))
 order by p.created_at desc limit greatest(1,least(coalesce(p_limit,30),50)) offset greatest(coalesce(p_offset,0),0);
$$;

-- Private post media bucket; the web signs image URLs when displaying them.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('social-posts','social-posts',false,12582912,array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "social_posts_storage_insert_own" on storage.objects;
create policy "social_posts_storage_insert_own" on storage.objects for insert to authenticated
with check(bucket_id='social-posts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "social_posts_storage_select_authenticated" on storage.objects;
create policy "social_posts_storage_select_authenticated" on storage.objects for select to authenticated using(bucket_id='social-posts');
drop policy if exists "social_posts_storage_delete_own" on storage.objects;
create policy "social_posts_storage_delete_own" on storage.objects for delete to authenticated
using(bucket_id='social-posts' and (storage.foldername(name))[1]=auth.uid()::text);

commit;
notify pgrst, 'reload schema';
