-- Melo Chat Web V13.2
-- Allow authenticated Melo users to read product/service images for approved public Partner businesses.
--
-- Root cause fixed here:
-- The existing "approved business media readable" storage.objects policy only allows
-- Partner logo/cover objects. Product/service images are stored in the same private
-- business-media bucket, but their paths live in
-- business_service_sales_settings.image_storage_path, so signed URL generation was
-- rejected by Storage RLS even though the image path existed in the database.
--
-- Backward compatibility:
-- image_storage_path may be either a single legacy path or a JSON array of paths.
-- This migration supports both without changing or deleting existing data.

begin;

create or replace function public.melo_service_media_path_matches(
  p_stored_paths text,
  p_object_name text
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $function$
declare
  v_stored text := btrim(coalesce(p_stored_paths, ''));
  v_object text := btrim(coalesce(p_object_name, ''));
  v_json jsonb;
  v_item text;
  v_normalized_object text;
  v_normalized_item text;
begin
  if v_stored = '' or v_object = '' then
    return false;
  end if;

  -- storage.objects.name does not include the bucket name.
  v_normalized_object := regexp_replace(v_object, '^/?business-media/', '', 'i');

  -- Legacy single-path format.
  v_normalized_item := regexp_replace(v_stored, '^/?business-media/', '', 'i');
  if v_normalized_item = v_normalized_object then
    return true;
  end if;

  -- Current multi-image format: JSON array serialized into image_storage_path.
  if left(v_stored, 1) = '[' then
    begin
      v_json := v_stored::jsonb;
      if jsonb_typeof(v_json) = 'array' then
        for v_item in
          select value
          from jsonb_array_elements_text(v_json)
        loop
          v_normalized_item := regexp_replace(btrim(v_item), '^/?business-media/', '', 'i');
          if v_normalized_item = v_normalized_object then
            return true;
          end if;
        end loop;
      end if;
    exception
      when others then
        -- Keep legacy/malformed values non-fatal for Storage RLS.
        null;
    end;
  end if;

  return false;
end;
$function$;

revoke all on function public.melo_service_media_path_matches(text, text) from public;
grant execute on function public.melo_service_media_path_matches(text, text) to authenticated;

create or replace function public.melo_can_read_public_service_media_object(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.business_service_sales_settings as settings
    join public.business_services as service
      on service.id = settings.service_id
    join public.business_accounts as business
      on business.id = service.business_id
    where business.status = 'approved'
      and business.is_public = true
      and coalesce(service.is_active, true) = true
      and nullif(btrim(settings.image_storage_path::text), '') is not null
      and public.melo_service_media_path_matches(
        settings.image_storage_path::text,
        p_object_name
      )
  );
$function$;

revoke all on function public.melo_can_read_public_service_media_object(text) from public;
grant execute on function public.melo_can_read_public_service_media_object(text) to authenticated;

-- Keep the existing logo/cover policy untouched. Add a narrow policy only for
-- active product/service media that belongs to an approved + public Partner.
drop policy if exists "approved public service media readable" on storage.objects;
create policy "approved public service media readable"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-media'
  and public.melo_can_read_public_service_media_object(name)
);

commit;

notify pgrst, 'reload schema';
