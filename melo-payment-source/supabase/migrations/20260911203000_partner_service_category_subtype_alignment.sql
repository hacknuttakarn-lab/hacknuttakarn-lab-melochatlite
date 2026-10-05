begin;

alter table if exists public.business_service_sales_settings
  add column if not exists service_subtype text;

comment on column public.business_service_sales_settings.service_subtype is
  'Structured Product/Service subtype. The primary Deals category remains business_services.category.';

-- Backward compatibility: preserve legacy subtype-like values without changing
-- the existing business_services.category rows automatically. Once a Partner
-- edits/saves an item in the aligned Web form, category is saved as the primary
-- Deals category and this column stores the structured subtype.
update public.business_service_sales_settings as settings
set service_subtype = nullif(trim(service.category), '')
from public.business_services as service
where settings.service_id = service.id
  and coalesce(trim(settings.service_subtype), '') = ''
  and coalesce(trim(service.category), '') <> ''
  and lower(trim(service.category)) not in (
    'accommodation',
    'food_drink',
    'tours_guides',
    'transport_rental',
    'activities_experiences',
    'sports_outdoor',
    'attractions',
    'events_entertainment',
    'wellness_lifestyle',
    'shopping_equipment',
    'traveler_services',
    'local_other'
  );

commit;

notify pgrst, 'reload schema';
