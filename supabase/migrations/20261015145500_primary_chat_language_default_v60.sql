-- Melo Chat Lite V60
-- Make the database default consistent with the Settings UI and Chat translation.
-- Existing legacy profiles with no primary language are treated as Thai.

update public.profiles
set primary_language = 'th'
where primary_language is null
   or btrim(primary_language) = '';

alter table public.profiles
  alter column primary_language set default 'th';

-- Normalize known verbose values if any were saved by older clients.
update public.profiles
set primary_language = case lower(btrim(primary_language))
  when 'thai' then 'th'
  when 'ไทย' then 'th'
  when 'english' then 'en'
  when 'german' then 'de'
  when 'deutsch' then 'de'
  else lower(btrim(primary_language))
end
where primary_language is not null;
