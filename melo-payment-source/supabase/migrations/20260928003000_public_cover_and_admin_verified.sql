-- Melo Chat Lite: public profile cover + admin-approved verification badge.
-- Scoped migration: does not modify unrelated profile fields or UI data.

alter table public.profiles
  add column if not exists cover_path text;

-- Preserve covers that users already uploaded before cover_path existed on profiles.
update public.profiles p
set cover_path = nullif(u.raw_user_meta_data ->> 'melo_profile_cover_path', '')
from auth.users u
where u.id = p.id
  and coalesce(p.cover_path, '') = ''
  and coalesce(u.raw_user_meta_data ->> 'melo_profile_cover_path', '') <> '';

-- Returns TRUE only when an identity-verification request for this user was
-- actually approved by the admin workflow. It deliberately does not use
-- reputation/profile "verified" flags.
create or replace function public.get_public_identity_verification(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  result boolean := false;
  has_user_id boolean;
  has_status boolean;
  has_is_verified boolean;
begin
  foreach candidate in array array[
    'identity_verification_requests',
    'verification_requests',
    'user_verifications',
    'verification_submissions'
  ] loop
    if to_regclass('public.' || candidate) is null then
      continue;
    end if;

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=candidate and column_name='user_id'
    ) into has_user_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=candidate and column_name='status'
    ) into has_status;
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=candidate and column_name='is_verified'
    ) into has_is_verified;

    if has_user_id and has_status then
      execute format(
        'select exists(select 1 from public.%I where user_id=$1 and lower(coalesce(status::text, '''')) in (''approved'',''approve'',''verified''))',
        candidate
      ) into result using p_user_id;
      if result then return true; end if;
    elsif has_user_id and has_is_verified then
      execute format(
        'select exists(select 1 from public.%I where user_id=$1 and coalesce(is_verified,false)=true)',
        candidate
      ) into result using p_user_id;
      if result then return true; end if;
    end if;
  end loop;

  return false;
end;
$$;

grant execute on function public.get_public_identity_verification(uuid) to authenticated;
