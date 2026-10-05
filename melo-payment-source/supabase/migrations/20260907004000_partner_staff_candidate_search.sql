-- MELO PARTNER STAFF CANDIDATE AUTOCOMPLETE
-- Allows only the owner of the selected business to search existing Melo users
-- by email prefix for the Add user to store dropdown.

begin;

create or replace function public.search_partner_staff_candidates(
  p_business_id uuid,
  p_query text
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  photo_path text,
  country text,
  nationality text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := lower(trim(coalesce(p_query, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_business_id is null then
    raise exception 'Partner business is required';
  end if;

  if not exists (
    select 1
    from public.business_accounts b
    where b.id = p_business_id
      and b.owner_id = v_user_id
  ) then
    raise exception 'Only the business owner can search users for store access';
  end if;

  if length(v_query) < 2 then
    return;
  end if;

  return query
  select
    u.id as user_id,
    lower(u.email)::text as email,
    coalesce(
      nullif(to_jsonb(p)->>'display_name', ''),
      split_part(lower(u.email), '@', 1),
      'Melo User'
    )::text as display_name,
    coalesce(
      nullif(to_jsonb(p)->>'photo_path', ''),
      nullif(to_jsonb(p)->>'profile_image_path', ''),
      case
        when jsonb_typeof(to_jsonb(p)->'photo_paths') = 'array'
          then nullif((to_jsonb(p)->'photo_paths')->>0, '')
        else null
      end
    )::text as photo_path,
    coalesce(to_jsonb(p)->>'country', '')::text as country,
    coalesce(to_jsonb(p)->>'nationality', '')::text as nationality
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.email is not null
    and u.id <> v_user_id
    and lower(u.email) like v_query || '%'
  order by
    case when lower(u.email) = v_query then 0 else 1 end,
    lower(u.email)
  limit 8;
end;
$$;

revoke all on function public.search_partner_staff_candidates(uuid, text) from public;
grant execute on function public.search_partner_staff_candidates(uuid, text) to authenticated;

commit;
