Melo Chat Lite - Settings Personal + Dating V34

Changed only Settings-related files.

1. Added Personal profile section to /settings.
   - Member ID, first/last name, email display
   - weight, height, nationality, location, occupation, education
   - relationship status, spoken languages, relationship type, sexual orientation, lifestyle
   - Profile Photos Gallery: 6 additional photos (main profile photo remains slot 1, total profile images = 7)
   - responsive desktop/mobile, light/dark theme
   - Thai / English / German copy

2. Existing discovery/connect section is relabeled Dating preferences in Thai/English/German. Existing Friend/Love behavior is preserved.

3. Supabase migration added:
   supabase/migrations/20260928160000_profile_personal_settings.sql

IMPORTANT: Run this SQL migration in the NEW Supabase project before saving the new personal fields.
The existing profile-photos bucket/policies are reused; no new bucket is required.

Build note: local build verification could not complete in the packaging environment because Next attempted to download the Linux SWC binary and external network access was unavailable.
