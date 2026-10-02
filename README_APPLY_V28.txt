Melo Chat Lite — V28 UI / Revenue / Reply / Mobile Keyboard Fix

Changes
1) Admin Center > Users > Choose package
   - Billing period select now follows Melo dark/light theme.
   - Larger select text.
2) User/Admin language selects
   - Native dropdowns follow the current dark/light color scheme and use larger mobile text.
3) Admin Center > Package reports
   - Fix admin package assignment transaction amount: now records selected 1/3/6 month list price instead of 0.
   - Migration repairs existing V25 admin_package_change rows when the prior note contains the preserved listed price.
4) Post comments
   - Reply to a top-level comment using existing parent_comment_id support.
   - Replies render indented under their parent comment.
5) Mobile comment drawer
   - Prevent iOS input zoom/horizontal viewport growth (16px composer text).
   - Keep latest comments visible when keyboard opens.
6) User Melo Chat Support mobile
   - Remove support logo from support conversation header.
   - Lock support content between the member AppShell header and bottom navigation.
   - Composer stays attached above bottom navigation.
   - Prevent iOS input zoom/width jump and keep latest messages visible on focus.
7) User match/direct chat mobile
   - Prevent iOS input zoom/width jump and scroll latest messages into view when composer receives focus.
8) Admin Support Chat mobile
   - Prevent iOS input zoom/width jump and keep latest support messages visible on composer focus.

SQL migration
supabase/migrations/20261002081500_package_revenue_v28.sql

Apply
cd D:\project\melochat-web-lite
npx supabase db push
npx tsc --noEmit
npm run build
npm run dev

Notes
- SQL is required for the Package Reports amount fix.
- Comment Reply uses the existing social_post_comments.parent_comment_id and existing create_social_post_comment RPC signature; no new reply table is created.
- Full-project TypeScript check in the assembly environment was blocked by missing current-project files/dependencies in the reconstructed source snapshot (@vercel/blob and lib/supabase/realtime). Syntax transpile checks PASSED for every TS/TSX file changed in V28. Run npx tsc --noEmit in the real project after overlaying.
