-- Melo Chat Lite: one authoritative public source for profile cover + verified badge.
-- Verified is TRUE only after the Admin Review Center has approved the request.

create or replace function public.get_public_profile_extras(p_user_id uuid)
returns table(cover_path text, verified boolean)
language sql
security definer
set search_path = public, auth
as $$
  select
    coalesce(
      nullif(p.cover_path, ''),
      nullif(u.raw_user_meta_data ->> 'melo_profile_cover_path', '')
    ) as cover_path,
    exists (
      select 1
      from public.verification_requests vr
      where vr.user_id = p_user_id
        and vr.status = 'approved'
        and vr.identity_status = 'approved'
        and vr.selfie_status = 'approved'
        and vr.reviewed_by is not null
        and vr.reviewed_at is not null
    ) as verified
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id
  limit 1;
$$;

grant execute on function public.get_public_profile_extras(uuid) to authenticated;

-- Keep profiles.cover_path populated for existing uploads as well.
alter table public.profiles add column if not exists cover_path text;
update public.profiles p
set cover_path = nullif(u.raw_user_meta_data ->> 'melo_profile_cover_path', '')
from auth.users u
where u.id = p.id
  and coalesce(p.cover_path, '') = ''
  and coalesce(u.raw_user_meta_data ->> 'melo_profile_cover_path', '') <> '';
