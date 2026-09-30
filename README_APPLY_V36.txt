Melo Chat Lite Settings V36

Changes only to Settings:
- Removed Appearance card.
- Removed Language and translation card.
- Removed Weight, Occupation, Lives in, Languages spoken from Personal profile.
- Education is now a dropdown.
- Looking for is a separate multi-select chip section.
- Sexual orientation is a separate multi-select chip section.
- Lifestyle is a structured section: Pets, Drinking, Smoking, Exercise, Social style, Interests.
- Responsive mobile/tablet + light/dark + TH/EN/DE retained.

Apply overlay to project root.
Run Supabase SQL migration:
  supabase/migrations/20260928173000_profile_matching_preferences.sql
Then run:
  npm run dev
