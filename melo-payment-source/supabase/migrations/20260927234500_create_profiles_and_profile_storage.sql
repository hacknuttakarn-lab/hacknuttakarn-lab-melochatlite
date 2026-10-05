-- Melo Chat Lite — fresh Supabase profile persistence + profile image storage.
-- Safe to run after the previous profile inline-edit migration.
begin;

-- The fresh Supabase project currently has no public.profiles table.
-- Create the minimal persistent profile row used by the current web Profile page.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  bio text,
  photo_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists photo_paths text[] not null default '{}'::text[];
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Ensure existing Auth users already have a row, including the currently logged-in user.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Future signups automatically receive a profile row.
create or replace function public.handle_new_profile_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_profile_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check (id = auth.uid());

-- Storage bucket used by profileWebData.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos','profile-photos',true,12582912,array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own"
on storage.objects for update to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own"
on storage.objects for delete to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);

commit;

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
