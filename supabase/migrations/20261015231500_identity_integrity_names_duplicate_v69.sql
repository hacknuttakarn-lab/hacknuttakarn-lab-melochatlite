-- Melo Chat Lite V69
-- Identity integrity: duplicate document prevention, English uppercase legal names,
-- Thai national ID checksum, verification/profile name parity, and admin issuing-country visibility.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.verification_requests
  add column if not exists issuing_country text;

update public.verification_requests v
set issuing_country = coalesce(nullif(trim(v.issuing_country),''), nullif(trim(p.nationality),''), 'UNKNOWN')
from public.profiles p
where p.id = v.user_id
  and nullif(trim(v.issuing_country),'') is null;

update public.verification_requests
set issuing_country = 'UNKNOWN'
where nullif(trim(issuing_country),'') is null;

create table if not exists private.identity_security_secret (
  singleton boolean primary key default true check (singleton),
  secret bytea not null,
  created_at timestamptz not null default now()
);

insert into private.identity_security_secret(singleton, secret)
select true, convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')
where not exists (select 1 from private.identity_security_secret where singleton = true);

revoke all on table private.identity_security_secret from public, anon, authenticated;

create table if not exists private.verification_document_fingerprints (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fingerprint text not null unique,
  document_type text not null,
  issuing_country text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table private.verification_document_fingerprints from public, anon, authenticated;

create or replace function private.normalize_document_number_v69(p_value text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select regexp_replace(upper(coalesce(trim(p_value),'')), '[^A-Z0-9]', '', 'g')
$$;

create or replace function private.is_thai_country_v69(p_value text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(coalesce(trim(p_value),'')) in ('thai','thailand','th','ประเทศไทย')
$$;

create or replace function private.normalize_issuing_country_v69(p_value text)
returns text
language sql
immutable
set search_path = private, pg_catalog
as $$
  select case
    when private.is_thai_country_v69(p_value) then 'TH'
    else regexp_replace(upper(coalesce(trim(p_value),'UNKNOWN')), '[^A-Z0-9]', '', 'g')
  end
$$;

create or replace function private.is_valid_thai_national_id_v69(p_value text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_digits text := regexp_replace(coalesce(p_value,''), '[^0-9]', '', 'g');
  v_sum integer := 0;
  v_i integer;
  v_check integer;
begin
  if v_digits !~ '^[0-9]{13}$' then return false; end if;
  for v_i in 1..12 loop
    v_sum := v_sum + substr(v_digits, v_i, 1)::integer * (14 - v_i);
  end loop;
  v_check := (11 - (v_sum % 11)) % 10;
  return v_check = substr(v_digits, 13, 1)::integer;
end;
$$;

create or replace function private.identity_document_fingerprint_v69(
  p_document_type text,
  p_issuing_country text,
  p_document_number text
) returns text
language plpgsql
security definer
set search_path = private, public, extensions, pg_catalog
as $$
declare
  v_secret bytea;
  v_payload text;
begin
  select secret into v_secret
  from private.identity_security_secret
  where singleton = true;

  if v_secret is null then
    raise exception 'IDENTITY_FINGERPRINT_SECRET_MISSING';
  end if;

  v_payload := lower(coalesce(trim(p_document_type),'unknown')) || '|' ||
               lower(private.normalize_issuing_country_v69(p_issuing_country)) || '|' ||
               private.normalize_document_number_v69(p_document_number);

  return encode(hmac(convert_to(v_payload, 'UTF8'), v_secret, 'sha256'), 'hex');
end;
$$;

revoke all on function private.normalize_document_number_v69(text) from public, anon, authenticated;
revoke all on function private.is_thai_country_v69(text) from public, anon, authenticated;
revoke all on function private.normalize_issuing_country_v69(text) from public, anon, authenticated;
revoke all on function private.is_valid_thai_national_id_v69(text) from public, anon, authenticated;
revoke all on function private.identity_document_fingerprint_v69(text,text,text) from public, anon, authenticated;

-- Normalize legacy English names when they are already compatible with the new rule.
update public.profiles
set first_name = upper(regexp_replace(trim(first_name), '\s+', ' ', 'g'))
where nullif(trim(first_name),'') is not null
  and upper(regexp_replace(trim(first_name), '\s+', ' ', 'g')) ~ '^[A-Z]+([ ''-][A-Z]+)*$';

update public.profiles
set last_name = upper(regexp_replace(trim(last_name), '\s+', ' ', 'g'))
where nullif(trim(last_name),'') is not null
  and upper(regexp_replace(trim(last_name), '\s+', ' ', 'g')) ~ '^[A-Z]+([ ''-][A-Z]+)*$';

create or replace function public.melo_enforce_profile_english_names_v69()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_first text;
  v_last text;
  v_check_first boolean := false;
  v_check_last boolean := false;
begin
  if tg_op = 'INSERT' then
    v_check_first := true;
    v_check_last := true;
  else
    v_check_first := new.first_name is distinct from old.first_name;
    v_check_last := new.last_name is distinct from old.last_name;
  end if;

  if v_check_first and nullif(trim(new.first_name),'') is not null then
    v_first := upper(regexp_replace(trim(new.first_name), '\s+', ' ', 'g'));
    if length(v_first) > 80 or v_first !~ '^[A-Z]+([ ''-][A-Z]+)*$' then
      raise exception 'NAME_ENGLISH_UPPERCASE_REQUIRED';
    end if;
    new.first_name := v_first;
  end if;

  if v_check_last and nullif(trim(new.last_name),'') is not null then
    v_last := upper(regexp_replace(trim(new.last_name), '\s+', ' ', 'g'));
    if length(v_last) > 80 or v_last !~ '^[A-Z]+([ ''-][A-Z]+)*$' then
      raise exception 'NAME_ENGLISH_UPPERCASE_REQUIRED';
    end if;
    new.last_name := v_last;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_melo_enforce_profile_english_names_v69 on public.profiles;
create trigger trg_melo_enforce_profile_english_names_v69
before insert or update of first_name, last_name on public.profiles
for each row execute function public.melo_enforce_profile_english_names_v69();

create or replace function public.melo_reverify_after_legal_name_change_v69()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_old_first text := upper(regexp_replace(trim(coalesce(old.first_name,'')), '\s+', ' ', 'g'));
  v_old_last text := upper(regexp_replace(trim(coalesce(old.last_name,'')), '\s+', ' ', 'g'));
  v_new_first text := upper(regexp_replace(trim(coalesce(new.first_name,'')), '\s+', ' ', 'g'));
  v_new_last text := upper(regexp_replace(trim(coalesce(new.last_name,'')), '\s+', ' ', 'g'));
begin
  if row(v_old_first, v_old_last) is distinct from row(v_new_first, v_new_last) then
    update public.verification_requests
    set status = 'rejected',
        identity_status = 'rejected',
        selfie_status = 'rejected',
        reviewer_notes = 'Your profile name changed. Please submit identity verification again.',
        reviewed_by = null,
        reviewed_at = null,
        updated_at = now()
    where user_id = new.id
      and status = 'approved';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_melo_reverify_after_legal_name_change_v69 on public.profiles;
create trigger trg_melo_reverify_after_legal_name_change_v69
after update of first_name, last_name on public.profiles
for each row execute function public.melo_reverify_after_legal_name_change_v69();

create or replace function public.melo_enforce_verification_identity_integrity_v69()
returns trigger
language plpgsql
security definer
set search_path = public, auth, private, extensions, pg_catalog
as $$
declare
  v_profile_first text;
  v_profile_last text;
  v_profile_country text;
  v_first text;
  v_last text;
  v_country text;
  v_number text;
  v_fingerprint text;
  v_owner uuid;
begin
  if tg_op='UPDATE' then
    if old.status='approved' and (
         new.legal_first_name_en is distinct from old.legal_first_name_en
      or new.legal_last_name_en is distinct from old.legal_last_name_en
      or new.document_type is distinct from old.document_type
      or new.document_number is distinct from old.document_number
      or new.issuing_country is distinct from old.issuing_country
    ) then
      raise exception 'VERIFICATION_APPROVED_LOCKED';
    end if;
  end if;

  select upper(regexp_replace(trim(coalesce(first_name,'')), '\s+', ' ', 'g')),
         upper(regexp_replace(trim(coalesce(last_name,'')), '\s+', ' ', 'g')),
         coalesce(nullif(trim(nationality),''),'UNKNOWN')
  into v_profile_first,v_profile_last,v_profile_country
  from public.profiles
  where id=new.user_id;

  v_first := upper(regexp_replace(trim(coalesce(new.legal_first_name_en,'')), '\s+', ' ', 'g'));
  v_last := upper(regexp_replace(trim(coalesce(new.legal_last_name_en,'')), '\s+', ' ', 'g'));
  if nullif(v_profile_first,'') is null or nullif(v_profile_last,'') is null then raise exception 'PROFILE_NAME_REQUIRED'; end if;
  if v_first !~ '^[A-Z]+([ ''-][A-Z]+)*$' or v_last !~ '^[A-Z]+([ ''-][A-Z]+)*$' then raise exception 'NAME_ENGLISH_UPPERCASE_REQUIRED'; end if;
  if v_first<>v_profile_first or v_last<>v_profile_last then raise exception 'PROFILE_NAME_MISMATCH'; end if;

  if new.document_type not in ('national_id','passport','driver_license') then raise exception 'INVALID_DOCUMENT_TYPE'; end if;
  v_country := coalesce(nullif(trim(new.issuing_country),''),v_profile_country,'UNKNOWN');
  v_number := private.normalize_document_number_v69(new.document_number);
  if nullif(v_number,'') is null then raise exception 'VERIFICATION_DETAILS_INCOMPLETE'; end if;
  if new.document_type='national_id' and private.is_thai_country_v69(v_country)
     and not private.is_valid_thai_national_id_v69(v_number) then raise exception 'THAI_ID_INVALID'; end if;

  v_fingerprint := private.identity_document_fingerprint_v69(new.document_type,v_country,v_number);
  select user_id into v_owner from private.verification_document_fingerprints where fingerprint=v_fingerprint limit 1;
  if v_owner is not null and v_owner<>new.user_id then raise exception 'DOCUMENT_ALREADY_USED'; end if;

  insert into private.verification_document_fingerprints(user_id,fingerprint,document_type,issuing_country,created_at,updated_at)
  values(new.user_id,v_fingerprint,new.document_type,v_country,now(),now())
  on conflict(user_id) do update set fingerprint=excluded.fingerprint,document_type=excluded.document_type,issuing_country=excluded.issuing_country,updated_at=now();

  new.legal_first_name_en := v_first;
  new.legal_last_name_en := v_last;
  new.document_number := v_number;
  new.issuing_country := v_country;
  return new;
exception when unique_violation then
  raise exception 'DOCUMENT_ALREADY_USED';
end;
$$;

drop trigger if exists trg_melo_enforce_verification_identity_integrity_v69 on public.verification_requests;
create trigger trg_melo_enforce_verification_identity_integrity_v69
before insert or update of legal_first_name_en,legal_last_name_en,document_type,document_number,issuing_country
on public.verification_requests
for each row execute function public.melo_enforce_verification_identity_integrity_v69();

-- Backfill one protected fingerprint per document. If duplicate legacy records already exist,
-- the approved/oldest record owns the fingerprint and future submissions from another account are blocked.
with candidates as (
  select
    v.user_id,
    v.document_type,
    coalesce(nullif(trim(v.issuing_country),''),'UNKNOWN') as issuing_country,
    private.identity_document_fingerprint_v69(v.document_type, coalesce(nullif(trim(v.issuing_country),''),'UNKNOWN'), v.document_number) as fingerprint,
    v.status,
    v.submitted_at,
    v.created_at
  from public.verification_requests v
  where nullif(private.normalize_document_number_v69(v.document_number),'') is not null
), ranked as (
  select c.*,
    row_number() over (
      partition by c.fingerprint
      order by case when c.status='approved' then 0 else 1 end,
               c.submitted_at asc nulls last,
               c.created_at asc
    ) as rn
  from candidates c
)
insert into private.verification_document_fingerprints(user_id,fingerprint,document_type,issuing_country,created_at,updated_at)
select user_id,fingerprint,document_type,issuing_country,now(),now()
from ranked
where rn=1
on conflict do nothing;

create or replace function public.check_my_verification_document_availability(
  p_document_type text,
  p_issuing_country text,
  p_document_number text
) returns table(available boolean, reason text)
language plpgsql
security definer
set search_path = public, auth, private, extensions, pg_catalog
as $$
declare
  v_fingerprint text;
  v_owner uuid;
  v_number text := private.normalize_document_number_v69(p_document_number);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_document_type not in ('national_id','passport','driver_license') then
    return query select false, 'INVALID_DOCUMENT_TYPE'::text; return;
  end if;
  if nullif(trim(p_issuing_country),'') is null or nullif(v_number,'') is null then
    return query select false, 'VERIFICATION_DETAILS_INCOMPLETE'::text; return;
  end if;
  if p_document_type='national_id' and private.is_thai_country_v69(p_issuing_country)
     and not private.is_valid_thai_national_id_v69(v_number) then
    return query select false, 'THAI_ID_INVALID'::text; return;
  end if;

  v_fingerprint := private.identity_document_fingerprint_v69(p_document_type,p_issuing_country,v_number);
  select user_id into v_owner
  from private.verification_document_fingerprints
  where fingerprint=v_fingerprint
  limit 1;

  if v_owner is null or v_owner=auth.uid() then
    return query select true, 'OK'::text;
  else
    return query select false, 'DOCUMENT_ALREADY_USED'::text;
  end if;
end;
$$;

grant execute on function public.check_my_verification_document_availability(text,text,text) to authenticated;

-- New V69 submission signature with explicit issuing country.
create or replace function public.submit_verification_request(
  p_legal_first_name_en text,
  p_legal_last_name_en text,
  p_document_type text,
  p_document_number text,
  p_issuing_country text,
  p_identity_document_path text,
  p_selfie_path text
) returns public.verification_requests
language plpgsql
security definer
set search_path = public, auth, private, extensions, pg_catalog
as $$
declare
  v public.verification_requests;
  v_profile_first text;
  v_profile_last text;
  v_profile_country text;
  v_first text := upper(regexp_replace(trim(coalesce(p_legal_first_name_en,'')), '\s+', ' ', 'g'));
  v_last text := upper(regexp_replace(trim(coalesce(p_legal_last_name_en,'')), '\s+', ' ', 'g'));
  v_country text;
  v_number text;
  v_fingerprint text;
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select
    upper(regexp_replace(trim(coalesce(first_name,'')), '\s+', ' ', 'g')),
    upper(regexp_replace(trim(coalesce(last_name,'')), '\s+', ' ', 'g')),
    nullif(trim(nationality),'')
  into v_profile_first,v_profile_last,v_profile_country
  from public.profiles
  where id=auth.uid();

  if nullif(v_profile_first,'') is null or nullif(v_profile_last,'') is null then
    raise exception 'PROFILE_NAME_REQUIRED';
  end if;
  if v_first !~ '^[A-Z]+([ ''-][A-Z]+)*$' or v_last !~ '^[A-Z]+([ ''-][A-Z]+)*$' or length(v_first)>80 or length(v_last)>80 then
    raise exception 'NAME_ENGLISH_UPPERCASE_REQUIRED';
  end if;
  if v_first<>v_profile_first or v_last<>v_profile_last then
    raise exception 'PROFILE_NAME_MISMATCH';
  end if;
  if p_document_type not in ('national_id','passport','driver_license') then raise exception 'INVALID_DOCUMENT_TYPE'; end if;

  v_country := coalesce(nullif(trim(p_issuing_country),''),v_profile_country,'UNKNOWN');
  v_number := private.normalize_document_number_v69(p_document_number);
  if nullif(v_number,'') is null then raise exception 'VERIFICATION_DETAILS_INCOMPLETE'; end if;
  if p_document_type='national_id' and private.is_thai_country_v69(v_country)
     and not private.is_valid_thai_national_id_v69(v_number) then
    raise exception 'THAI_ID_INVALID';
  end if;

  if coalesce(trim(p_identity_document_path),'')='' or coalesce(trim(p_selfie_path),'')='' then raise exception 'VERIFICATION_FILES_INCOMPLETE'; end if;
  if split_part(p_identity_document_path,'/',1)<>auth.uid()::text or split_part(p_selfie_path,'/',1)<>auth.uid()::text then raise exception 'INVALID_VERIFICATION_FILE_PATH'; end if;

  v_fingerprint := private.identity_document_fingerprint_v69(p_document_type,v_country,v_number);
  select user_id into v_owner from private.verification_document_fingerprints where fingerprint=v_fingerprint limit 1;
  if v_owner is not null and v_owner<>auth.uid() then raise exception 'DOCUMENT_ALREADY_USED'; end if;

  insert into private.verification_document_fingerprints(user_id,fingerprint,document_type,issuing_country,created_at,updated_at)
  values(auth.uid(),v_fingerprint,p_document_type,v_country,now(),now())
  on conflict(user_id) do update
    set fingerprint=excluded.fingerprint,
        document_type=excluded.document_type,
        issuing_country=excluded.issuing_country,
        updated_at=now();

  insert into public.verification_requests(
    user_id,legal_first_name_en,legal_last_name_en,document_type,document_number,issuing_country,
    identity_document_path,selfie_path,status,identity_status,selfie_status,reviewer_notes,reviewed_by,reviewed_at,submitted_at,updated_at
  ) values(
    auth.uid(),v_first,v_last,p_document_type,v_number,v_country,
    p_identity_document_path,p_selfie_path,'pending','pending','pending',null,null,null,now(),now()
  )
  on conflict(user_id) do update set
    legal_first_name_en=excluded.legal_first_name_en,
    legal_last_name_en=excluded.legal_last_name_en,
    document_type=excluded.document_type,
    document_number=excluded.document_number,
    issuing_country=excluded.issuing_country,
    identity_document_path=excluded.identity_document_path,
    selfie_path=excluded.selfie_path,
    status='pending',identity_status='pending',selfie_status='pending',
    reviewer_notes=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
  where public.verification_requests.status<>'approved'
  returning * into v;

  if v.id is null then select * into v from public.verification_requests where user_id=auth.uid(); end if;
  return v;
exception
  when unique_violation then
    raise exception 'DOCUMENT_ALREADY_USED';
end;
$$;

grant execute on function public.submit_verification_request(text,text,text,text,text,text,text) to authenticated;

-- Keep the existing six-argument client contract safe for older clients.
create or replace function public.submit_verification_request(
  p_legal_first_name_en text,
  p_legal_last_name_en text,
  p_document_type text,
  p_document_number text,
  p_identity_document_path text,
  p_selfie_path text
) returns public.verification_requests
language plpgsql
security definer
set search_path = public, auth, private, extensions, pg_catalog
as $$
declare
  v public.verification_requests;
  v_country text;
begin
  select coalesce(nullif(trim(nationality),''),'UNKNOWN') into v_country
  from public.profiles where id=auth.uid();

  select * into v from public.submit_verification_request(
    p_legal_first_name_en,p_legal_last_name_en,p_document_type,p_document_number,
    coalesce(v_country,'UNKNOWN'),p_identity_document_path,p_selfie_path
  );
  return v;
end;
$$;

grant execute on function public.submit_verification_request(text,text,text,text,text,text) to authenticated;

-- Secure the legacy details-only alias too, so it cannot bypass duplicate-document protection.
create or replace function public.submit_identity_verification_details(
  p_legal_first_name_en text,
  p_legal_last_name_en text,
  p_document_type text,
  p_document_number text
) returns public.verification_requests
language plpgsql
security definer
set search_path = public, auth, private, extensions, pg_catalog
as $$
declare
  v public.verification_requests;
  v_profile_first text;
  v_profile_last text;
  v_country text;
  v_first text := upper(regexp_replace(trim(coalesce(p_legal_first_name_en,'')), '\s+', ' ', 'g'));
  v_last text := upper(regexp_replace(trim(coalesce(p_legal_last_name_en,'')), '\s+', ' ', 'g'));
  v_number text := private.normalize_document_number_v69(p_document_number);
  v_fingerprint text;
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select upper(regexp_replace(trim(coalesce(first_name,'')), '\s+', ' ', 'g')),
         upper(regexp_replace(trim(coalesce(last_name,'')), '\s+', ' ', 'g')),
         coalesce(nullif(trim(nationality),''),'UNKNOWN')
  into v_profile_first,v_profile_last,v_country
  from public.profiles where id=auth.uid();

  if v_first<>v_profile_first or v_last<>v_profile_last then raise exception 'PROFILE_NAME_MISMATCH'; end if;
  if v_first !~ '^[A-Z]+([ ''-][A-Z]+)*$' or v_last !~ '^[A-Z]+([ ''-][A-Z]+)*$' then raise exception 'NAME_ENGLISH_UPPERCASE_REQUIRED'; end if;
  if p_document_type='national_id' and private.is_thai_country_v69(v_country)
     and not private.is_valid_thai_national_id_v69(v_number) then raise exception 'THAI_ID_INVALID'; end if;

  v_fingerprint := private.identity_document_fingerprint_v69(p_document_type,v_country,v_number);
  select user_id into v_owner from private.verification_document_fingerprints where fingerprint=v_fingerprint limit 1;
  if v_owner is not null and v_owner<>auth.uid() then raise exception 'DOCUMENT_ALREADY_USED'; end if;

  insert into private.verification_document_fingerprints(user_id,fingerprint,document_type,issuing_country,created_at,updated_at)
  values(auth.uid(),v_fingerprint,p_document_type,v_country,now(),now())
  on conflict(user_id) do update set fingerprint=excluded.fingerprint,document_type=excluded.document_type,issuing_country=excluded.issuing_country,updated_at=now();

  insert into public.verification_requests(user_id,legal_first_name_en,legal_last_name_en,document_type,document_number,issuing_country,status,identity_status,selfie_status,updated_at)
  values(auth.uid(),v_first,v_last,p_document_type,v_number,v_country,'pending','pending','pending',now())
  on conflict(user_id) do update set legal_first_name_en=excluded.legal_first_name_en,legal_last_name_en=excluded.legal_last_name_en,
    document_type=excluded.document_type,document_number=excluded.document_number,issuing_country=excluded.issuing_country,updated_at=now()
  returning * into v;
  return v;
exception when unique_violation then
  raise exception 'DOCUMENT_ALREADY_USED';
end;
$$;

grant execute on function public.submit_identity_verification_details(text,text,text,text) to authenticated;

-- Admin user-document popup: add issuing_country to the same RPC.
drop function if exists public.admin_center_get_user_documents(uuid);
create function public.admin_center_get_user_documents(p_user_id uuid)
returns table(
 id uuid,user_id uuid,status text,submitted_at timestamptz,reviewed_at timestamptz,
 legal_first_name_en text,legal_last_name_en text,document_type text,document_number text,issuing_country text,
 identity_document_path text,selfie_path text,reviewer_notes text
)
language plpgsql security definer set search_path=public as $$
begin
  if not exists(
    select 1 from public.admin_users a where a.user_id=auth.uid() and coalesce(a.is_active,true)=true
    and (a.role='super_admin' or coalesce((a.permissions->>'users_view')::boolean,false) or coalesce((a.permissions->>'verification_view')::boolean,false))
  ) then raise exception 'Admin access required'; end if;
  return query
  select v.id,v.user_id,v.status,v.submitted_at,v.reviewed_at,v.legal_first_name_en,v.legal_last_name_en,
         v.document_type,v.document_number,v.issuing_country,v.identity_document_path,v.selfie_path,v.reviewer_notes
  from public.verification_requests v
  where v.user_id=p_user_id
  order by v.submitted_at desc nulls last
  limit 1;
end;$$;
grant execute on function public.admin_center_get_user_documents(uuid) to authenticated;

commit;
