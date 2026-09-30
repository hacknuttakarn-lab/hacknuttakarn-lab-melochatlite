Melo Chat Lite V43 — Profile / Home discovery / Feed Connect fix

Fixed:
1. Own Profile now derives identity from the real public.profiles row instead of the removed mock people array.
2. Home recommendation loader falls back to public.profiles when legacy dating-feed RPCs do not exist in the fresh Supabase project.
3. Profiles without date_of_birth are no longer silently excluded from Home recommendations.
4. Feed Connect side panels now load real Likes You / Matches from Supabase instead of the deleted mock people array.
5. Added a fresh-Supabase migration for discovery fields, profile_likes, profile_favorites, profile_matches, and authenticated profile discovery RLS.

IMPORTANT DATABASE STEP:
Run this migration in the NEW Supabase project before testing Home/Connect:
supabase/migrations/20260928190000_lite_discovery_connect_fix.sql

No Docker is required. You can paste the SQL into Supabase SQL Editor and Run it.

Then restart:
npm run dev
