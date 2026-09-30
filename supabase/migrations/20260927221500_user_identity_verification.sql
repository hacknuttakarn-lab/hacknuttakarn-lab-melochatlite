-- Melo Chat Lite/Web: User identity verification foundation for a fresh Supabase project.
-- Scope: user Verify page + existing Admin Review Center compatibility.

create extension if not exists pgcrypto;

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_first_name_en text not null default '',
  legal_last_name_en text not null default '',
  document_type text not null default 'national_id' check (document_type in ('national_id','passport','driver_license')),
  document_number text not null default '',
  identity_document_path text,
  selfie_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  identity_status text not null default 'pending' check (identity_status in ('pending','approved','rejected')),
  selfie_status text not null default 'pending' check (selfie_status in ('pending','approved','rejected')),
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_requests_user_unique unique(user_id)
);

alter table public.verification_requests enable row level security;

drop policy if exists verification_select_own on public.verification_requests;
create policy verification_select_own on public.verification_requests for select to authenticated using (auth.uid() = user_id);
drop policy if exists verification_insert_own on public.verification_requests;
create policy verification_insert_own on public.verification_requests for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists verification_update_own on public.verification_requests;
create policy verification_update_own on public.verification_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('verification-private','verification-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists verification_storage_insert_own on storage.objects;
create policy verification_storage_insert_own on storage.objects for insert to authenticated
with check (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists verification_storage_update_own on storage.objects;
create policy verification_storage_update_own on storage.objects for update to authenticated
using (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists verification_storage_select_own on storage.objects;
create policy verification_storage_select_own on storage.objects for select to authenticated
using (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.get_my_verification()
returns setof public.verification_requests language sql security definer set search_path=public,auth as $$
  select * from public.verification_requests where user_id=auth.uid() limit 1;
$$;
grant execute on function public.get_my_verification() to authenticated;

create or replace function public.submit_verification_request(
  p_legal_first_name_en text,
  p_legal_last_name_en text,
  p_document_type text,
  p_document_number text,
  p_identity_document_path text,
  p_selfie_path text
) returns public.verification_requests
language plpgsql security definer set search_path=public,auth as $$
declare v public.verification_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_legal_first_name_en),'')='' or coalesce(trim(p_legal_last_name_en),'')='' or coalesce(trim(p_document_number),'')='' then raise exception 'Verification details are incomplete'; end if;
  if p_document_type not in ('national_id','passport','driver_license') then raise exception 'Invalid document type'; end if;
  if coalesce(trim(p_identity_document_path),'')='' or coalesce(trim(p_selfie_path),'')='' then raise exception 'Verification files are incomplete'; end if;
  if split_part(p_identity_document_path,'/',1) <> auth.uid()::text or split_part(p_selfie_path,'/',1) <> auth.uid()::text then raise exception 'Invalid verification file path'; end if;
  insert into public.verification_requests(user_id,legal_first_name_en,legal_last_name_en,document_type,document_number,identity_document_path,selfie_path,status,identity_status,selfie_status,reviewer_notes,reviewed_by,reviewed_at,submitted_at,updated_at)
  values(auth.uid(),trim(p_legal_first_name_en),trim(p_legal_last_name_en),p_document_type,trim(p_document_number),p_identity_document_path,p_selfie_path,'pending','pending','pending',null,null,null,now(),now())
  on conflict(user_id) do update set legal_first_name_en=excluded.legal_first_name_en,legal_last_name_en=excluded.legal_last_name_en,document_type=excluded.document_type,document_number=excluded.document_number,identity_document_path=excluded.identity_document_path,selfie_path=excluded.selfie_path,status='pending',identity_status='pending',selfie_status='pending',reviewer_notes=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
  where public.verification_requests.status <> 'approved'
  returning * into v;
  if v.id is null then select * into v from public.verification_requests where user_id=auth.uid(); end if;
  return v;
end $$;
grant execute on function public.submit_verification_request(text,text,text,text,text,text) to authenticated;

-- Alias retained for Android/older clients that submit details separately.
create or replace function public.submit_identity_verification_details(p_legal_first_name_en text,p_legal_last_name_en text,p_document_type text,p_document_number text)
returns public.verification_requests language plpgsql security definer set search_path=public,auth as $$
declare v public.verification_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.verification_requests(user_id,legal_first_name_en,legal_last_name_en,document_type,document_number,status,identity_status,selfie_status,updated_at)
  values(auth.uid(),trim(p_legal_first_name_en),trim(p_legal_last_name_en),p_document_type,trim(p_document_number),'pending','pending','pending',now())
  on conflict(user_id) do update set legal_first_name_en=excluded.legal_first_name_en,legal_last_name_en=excluded.legal_last_name_en,document_type=excluded.document_type,document_number=excluded.document_number,updated_at=now()
  returning * into v; return v;
end $$;
grant execute on function public.submit_identity_verification_details(text,text,text,text) to authenticated;

-- Existing Admin Review Center RPC names. Access is restricted to rows in admin_users when that table exists.
create or replace function public.melo_is_verification_admin()
returns boolean language plpgsql security definer set search_path=public as $$
declare ok boolean:=false;
begin
  if to_regclass('public.admin_users') is null then return false; end if;
  execute 'select exists(select 1 from public.admin_users where user_id=$1 and is_active=true and role in (''admin'',''super_admin''))' into ok using auth.uid();
  return ok;
exception when others then return false;
end $$;

create or replace function public.get_admin_verification_queue(p_status text default 'pending',p_limit integer default 200)
returns table(id uuid,user_id uuid,user_email text,status text,submitted_at timestamptz,legal_first_name_en text,legal_last_name_en text,document_type text,document_number text,selfie_status text,identity_status text,selfie_path text,identity_document_path text,reviewer_notes text,reviewed_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.melo_is_verification_admin() then raise exception 'Admin access required'; end if;
  return query select v.id,v.user_id,u.email::text,v.status,v.submitted_at,v.legal_first_name_en,v.legal_last_name_en,v.document_type,v.document_number,v.selfie_status,v.identity_status,v.selfie_path,v.identity_document_path,v.reviewer_notes,v.reviewed_at from public.verification_requests v left join auth.users u on u.id=v.user_id where (p_status is null or p_status='' or v.status=p_status) order by v.submitted_at desc limit greatest(1,least(coalesce(p_limit,200),500));
end $$;
grant execute on function public.get_admin_verification_queue(text,integer) to authenticated;

create or replace function public.get_admin_verification_identity_details(p_user_ids uuid[])
returns setof public.verification_requests language plpgsql security definer set search_path=public as $$
begin
 if not public.melo_is_verification_admin() then raise exception 'Admin access required'; end if;
 return query select * from public.verification_requests where user_id=any(coalesce(p_user_ids,array[]::uuid[]));
end $$;
grant execute on function public.get_admin_verification_identity_details(uuid[]) to authenticated;

create or replace function public.resolve_admin_verification_request(p_request_id uuid,p_action text,p_note text default null)
returns public.verification_requests language plpgsql security definer set search_path=public as $$
declare v public.verification_requests; s text;
begin
 if not public.melo_is_verification_admin() then raise exception 'Admin access required'; end if;
 s:=case when lower(p_action) in ('approve','approved') then 'approved' when lower(p_action) in ('reject','rejected','request_info','request_changes') then 'rejected' else null end;
 if s is null then raise exception 'Invalid review action'; end if;
 update public.verification_requests set status=s,identity_status=s,selfie_status=s,reviewer_notes=nullif(trim(p_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_request_id returning * into v;
 return v;
end $$;
grant execute on function public.resolve_admin_verification_request(uuid,text,text) to authenticated;
