-- Melo Chat Lite V49 — direct chat image storage repair
-- Fixes the red "Bucket not found" error seen when sending user-to-user images.
-- Safe to run in Supabase SQL Editor. Idempotent for repeated runs.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'chat-media',
  'chat-media',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Authenticated chat participants can resolve signed URLs for stored chat media.
drop policy if exists melo_chat_media_read_authenticated_v49 on storage.objects;
create policy melo_chat_media_read_authenticated_v49
on storage.objects
for select
to authenticated
using(bucket_id='chat-media');

-- Upload paths are always prefixed by the current user's auth.uid().
drop policy if exists melo_chat_media_insert_own_v49 on storage.objects;
create policy melo_chat_media_insert_own_v49
on storage.objects
for insert
to authenticated
with check(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists melo_chat_media_update_own_v49 on storage.objects;
create policy melo_chat_media_update_own_v49
on storage.objects
for update
to authenticated
using(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists melo_chat_media_delete_own_v49 on storage.objects;
create policy melo_chat_media_delete_own_v49
on storage.objects
for delete
to authenticated
using(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

alter table if exists public.chat_messages
  add column if not exists message_type text default 'text',
  add column if not exists media_path text;

-- Verification result: this SELECT should return exactly one row named chat-media.
select id,name,public,file_size_limit
from storage.buckets
where id='chat-media';
