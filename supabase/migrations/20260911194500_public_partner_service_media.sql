-- Melo Chat Web V13.1
-- Public, viewer-safe media bridge for Partner product/service cards.
--
-- Product/service photos are stored in business-media and their storage paths live in
-- business_service_sales_settings.image_storage_path. Public service summary RPCs are
-- intentionally compact and do not expose those paths, so public Web surfaces need a
-- narrow RPC that only returns media for active services belonging to an already-public
-- Partner business.

begin;

create or replace function public.melo_public_partner_service_media(
  p_business_id uuid
)
returns table (
  service_id uuid,
  image_storage_path text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    service.id as service_id,
    settings.image_storage_path::text as image_storage_path
  from public.business_services as service
  join public.business_service_sales_settings as settings
    on settings.service_id = service.id
  where service.business_id = p_business_id
    and coalesce(service.is_active, true) = true
    and nullif(btrim(settings.image_storage_path::text), '') is not null
    and exists (
      select 1
      from public.melo_public_businesses() as allowed_business
      where coalesce(
        nullif(to_jsonb(allowed_business) ->> 'id', ''),
        nullif(to_jsonb(allowed_business) ->> 'business_id', ''),
        nullif(to_jsonb(allowed_business) ->> 'business_account_id', '')
      ) = service.business_id::text
    );
$function$;

revoke all on function public.melo_public_partner_service_media(uuid) from public;
grant execute on function public.melo_public_partner_service_media(uuid) to anon, authenticated;

comment on function public.melo_public_partner_service_media(uuid)
is 'Returns only product/service media storage paths for active services of a Partner that passes the central public business gate.';

commit;

notify pgrst, 'reload schema';
