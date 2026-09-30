Melo Chat Lite — Profile avatar sync + real social post persistence

Changed only:
- components/Header.tsx
- components/lite/LiteMockExperience.tsx
- supabase/migrations/20260928001000_social_posts_and_profile_avatar_sync.sql

What changed:
1. Header account/profile icon now reads the signed-in user's current profile photo.
2. Changing the profile photo dispatches an immediate profile-updated event so Header refreshes without logout/reload.
3. Profile post composer now uses the existing real SocialPostComposerModal instead of local mock-only state.
4. Posts can persist text/title and up to 8 images (12 MB each) through Supabase.
5. Newly saved posts are reloaded on the Profile page.

REQUIRED FOR THE FRESH SUPABASE PROJECT:
Run this migration in Supabase SQL Editor:
  supabase/migrations/20260928001000_social_posts_and_profile_avatar_sync.sql

The migration creates the social post tables/RPCs, social-posts Storage bucket and policies, and adds profile columns already expected by the web code.
