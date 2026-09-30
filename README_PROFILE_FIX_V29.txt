Melo Chat Lite — Profile Fix V29

What the screenshot proves:
- "Could not find the table 'public.profiles' in the schema cache" means the fresh Supabase project does not have public.profiles.
- The previous migration used ALTER TABLE IF EXISTS, so it succeeded without creating the missing table.
- That is why About me cannot save, and avatar upload later fails when it tries to persist photo_paths.

Apply:
1) Overlay this ZIP onto the current project.
2) Supabase > SQL Editor: run supabase/migrations/20260927234500_create_profiles_and_profile_storage.sql
3) Confirm the result says Success.
4) Refresh the web page. If an old auth/session cache remains, sign out/in once.

UI change:
- Profile Identity Card now has the same outer left/right width as the cover card.
- Only Profile CSS + this SQL migration are included. No Chat/Admin/Verify files are touched.
