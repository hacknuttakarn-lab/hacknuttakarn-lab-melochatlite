-- Melo Chat Lite: User Verify bootstrap for a fresh Supabase project.
-- Creates the user identity verification tables, private storage bucket,
-- RLS policies, user submission RPCs, and Admin Review RPCs used by the web app.

create extension if not exists pgcrypto;

create table if not exists public.verification_identity_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_first_name_en text not null default '',
  legal_last_name_en text not null default '',
  document_type text not null default 'passport',
  document_number text not null default '',
  identity_document_path text,
  selfie_path text,
  identity_status text not null default 'pending' check (identity_status in ('pending','approved','rejected','more_info')),
  selfie_status text not null default 'pending' check (selfie_status in ('pending','approved','rejected','more_info')),
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','more_info')),
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verification_requests_user_submitted_idx on public.verification_requests(user_id, submitted_at desc);
create index if not exists verification_requests_status_submitted_idx on public.verification_requests(status, submitted_at desc);

-- If the fresh project does not yet have admin_users, this minimal compatible table
-- also supports the existing Melo Admin Review access model.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('reviewer','admin','super_admin')),
  is_active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verification_identity_details enable row level security;
alter table public.verification_requests enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists verification_identity_owner_select on public.verification_identity_details;
create policy verification_identity_owner_select on public.verification_identity_details for select to authenticated using (auth.uid() = user_id);
drop policy if exists verification_identity_owner_insert on public.verification_identity_details;
create policy verification_identity_owner_insert on public.verification_identity_details for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists verification_identity_owner_update on public.verification_identity_details;
create policy verification_identity_owner_update on public.verification_identity_details for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists verification_request_owner_select on public.verification_requests;
create policy verification_request_owner_select on public.verification_requests for select to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('verification-private','verification-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists verification_private_owner_insert on storage.objects;
create policy verification_private_owner_insert on storage.objects for insert to authenticated with check (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists verification_private_owner_update on storage.objects;
create policy verification_private_owner_update on storage.objects for update to authenticated using (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists verification_private_owner_select on storage.objects;
create policy verification_private_owner_select on storage.objects for select to authenticated using (bucket_id='verification-private' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.is_melo_admin(p_permission text default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.admin_users a
    where a.user_id=auth.uid() and a.is_active=true
      and (a.role in ('admin','super_admin') or (a.permissions ->> coalesce(p_permission,''))::boolean is true)
  );
$$;

create or replace function public.submit_identity_verification_details(
  p_legal_first_name_en text, p_legal_last_name_en text, p_document_type text,
  p_document_number text, p_identity_document_path text, p_selfie_path text
) returns public.verification_identity_details
language plpgsql security definer set search_path=public as $$
declare v public.verification_identity_details;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if nullif(trim(p_legal_first_name_en),'') is null or nullif(trim(p_legal_last_name_en),'') is null or nullif(trim(p_document_number),'') is null then raise exception 'Identity details are incomplete'; end if;
  insert into public.verification_identity_details(user_id,legal_first_name_en,legal_last_name_en,document_type,document_number,identity_document_path,selfie_path,identity_status,selfie_status,updated_at)
  values(auth.uid(),trim(p_legal_first_name_en),trim(p_legal_last_name_en),coalesce(nullif(trim(p_document_type),''),'passport'),trim(p_document_number),p_identity_document_path,p_selfie_path,'pending','pending',now())
  on conflict(user_id) do update set legal_first_name_en=excluded.legal_first_name_en,legal_last_name_en=excluded.legal_last_name_en,document_type=excluded.document_type,document_number=excluded.document_number,identity_document_path=excluded.identity_document_path,selfie_path=excluded.selfie_path,identity_status='pending',selfie_status='pending',updated_at=now()
  returning * into v; return v;
end $$;

create or replace function public.submit_verification_request()
returns public.verification_requests language plpgsql security definer set search_path=public as $$
declare v public.verification_requests;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.verification_identity_details d where d.user_id=auth.uid() and d.identity_document_path is not null and d.selfie_path is not null) then raise exception 'Verification documents are incomplete'; end if;
  update public.verification_requests set status='pending',reviewer_notes=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now() where id=(select id from public.verification_requests where user_id=auth.uid() order by submitted_at desc limit 1) returning * into v;
  if v.id is null then insert into public.verification_requests(user_id) values(auth.uid()) returning * into v; end if;
  return v;
end $$;

create or replace function public.get_my_admin_review_access()
returns table(user_id uuid,email text,role text,is_active boolean,permissions jsonb)
language sql stable security definer set search_path=public as $$
 select u.id,u.email,a.role,a.is_active,case when a.role in ('admin','super_admin') then a.permissions || jsonb_build_object('verification_view',true,'verification_action',true) else a.permissions end from auth.users u join public.admin_users a on a.user_id=u.id where u.id=auth.uid();
$$;


create or replace function public.get_my_admin_review_home_status()
returns table(has_access boolean,pending_count bigint)
language sql stable security definer set search_path=public as $$
 select public.is_melo_admin('verification_view'),
        case when public.is_melo_admin('verification_view') then (select count(*) from public.verification_requests where status='pending') else 0 end;
$$;

create or replace function public.get_admin_verification_queue(p_status text default 'pending', p_limit int default 200)
returns table(id uuid,user_id uuid,user_email text,display_name text,status text,submitted_at timestamptz,reviewer_notes text,reviewed_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_melo_admin('verification_view') then raise exception 'Access denied'; end if;
 return query select r.id,r.user_id,u.email::text,coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'full_name','')),''),split_part(u.email,'@',1)),r.status,r.submitted_at,r.reviewer_notes,r.reviewed_at from public.verification_requests r join auth.users u on u.id=r.user_id where (p_status='all' or r.status=p_status) order by r.submitted_at desc limit greatest(1,least(coalesce(p_limit,200),500));
end $$;

create or replace function public.get_admin_verification_identity_details(p_user_ids uuid[])
returns table(user_id uuid,legal_first_name_en text,legal_last_name_en text,document_type text,document_number text,identity_details_complete boolean,selfie_status text,identity_status text,selfie_path text,identity_document_path text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_melo_admin('verification_view') then raise exception 'Access denied'; end if;
 return query select d.user_id,d.legal_first_name_en,d.legal_last_name_en,d.document_type,d.document_number,(d.legal_first_name_en<>'' and d.legal_last_name_en<>'' and d.document_number<>'' and d.identity_document_path is not null and d.selfie_path is not null),d.selfie_status,d.identity_status,d.selfie_path,d.identity_document_path from public.verification_identity_details d where d.user_id=any(p_user_ids);
end $$;

create or replace function public.resolve_admin_verification_request(p_request_id uuid,p_action text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid; v_status text;
begin
 if not public.is_melo_admin('verification_action') then raise exception 'Access denied'; end if;
 v_status:=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' when 'request_info' then 'more_info' else null end;
 if v_status is null then raise exception 'Unsupported action'; end if;
 update public.verification_requests set status=v_status,reviewer_notes=p_note,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_request_id returning user_id into v_user;
 if v_user is null then raise exception 'Verification request not found'; end if;
 update public.verification_identity_details set identity_status=v_status,selfie_status=v_status,updated_at=now() where user_id=v_user;
end $$;

drop policy if exists verification_private_admin_select on storage.objects;
create policy verification_private_admin_select on storage.objects for select to authenticated using (bucket_id='verification-private' and public.is_melo_admin('verification_view'));

grant execute on function public.submit_identity_verification_details(text,text,text,text,text,text) to authenticated;
grant execute on function public.submit_verification_request() to authenticated;
grant execute on function public.get_my_admin_review_access() to authenticated;
grant execute on function public.get_my_admin_review_home_status() to authenticated;
grant execute on function public.get_admin_verification_queue(text,int) to authenticated;
grant execute on function public.get_admin_verification_identity_details(uuid[]) to authenticated;
grant execute on function public.resolve_admin_verification_request(uuid,text,text) to authenticated;
