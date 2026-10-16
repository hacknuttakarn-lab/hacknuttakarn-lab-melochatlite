Melo Chat Lite V70 - Free Save Posts

Change:
- Free members can save/unsave posts in Feed.
- Saved tab remains available.
- No other Free/Premium/Premium+ entitlements are changed.

Apply:
1. Run supabase/migrations/20261016154000_free_save_posts_v70.sql in Supabase SQL Editor.
2. Copy this overlay on top of the current project.
3. Run:
   npx tsc --noEmit
   npm run build
4. Deploy when both pass.
