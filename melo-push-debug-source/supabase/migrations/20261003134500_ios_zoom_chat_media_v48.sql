-- Melo Chat Lite V48
-- 1) Ensure the private chat-media bucket exists for direct-chat image attachments.
-- 2) Ensure direct chat_messages has the metadata columns needed by image messages.
-- Safe to run from Supabase SQL Editor; statements are idempotent.

begin;

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

alter table storage.objects enable row level security;

drop policy if exists melo_chat_media_read_authenticated_v48 on storage.objects;
create policy melo_chat_media_read_authenticated_v48
on storage.objects
for select
to authenticated
using(bucket_id='chat-media');

drop policy if exists melo_chat_media_insert_own_v48 on storage.objects;
create policy melo_chat_media_insert_own_v48
on storage.objects
for insert
to authenticated
with check(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists melo_chat_media_update_own_v48 on storage.objects;
create policy melo_chat_media_update_own_v48
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

drop policy if exists melo_chat_media_delete_own_v48 on storage.objects;
create policy melo_chat_media_delete_own_v48
on storage.objects
for delete
to authenticated
using(
  bucket_id='chat-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

-- Rich-message metadata. Existing text messages remain unchanged.
alter table if exists public.chat_messages
  add column if not exists message_type text default 'text',
  add column if not exists media_path text;

commit;
