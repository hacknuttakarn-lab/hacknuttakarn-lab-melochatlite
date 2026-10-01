Melo Chat Lite — Profile Chat / Post Boost / Verification Watermark V8
Date: 2026-10-01

BASE USED
- melochat-web-lite(8).zip
- Applied latest overlays in order: Support Inbox V2, Admin Activity/Push V3,
  Admin Notify/Verify/Support Translation V4, Admin Support Notification V5,
  User Support/Verify Notification V6, User Support Notification V7.

CHANGES
1) Matched profile action
- On another user's profile, when that user is already a Match, the Connect/heart action
  is replaced with a Chat button.
- The button opens the existing Direct/Match Chat through melo-open-direct-chat.
- Existing Block and Follow behavior are preserved.

2) Boost Post
- Adds "Boost post / บูทโพสต์ / Beitrag boosten" to the owner's three-dot post menu.
- Boost does not rewrite created_at. It writes social_posts.boosted_at and Feed sorting uses
  coalesce(boosted_at, created_at), so boosted posts return to the top of Feed.
- Package/quota enforcement is intentionally NOT added yet; this is the foundation for the
  future package system requested by the project owner.

3) Verification document watermark
- Identity-document image previews now show the Thai watermark:
  "เอกสารใช้เพื่อยืนยันตัวตนในระบบ Melo Chat เท่านั้น"
- Applied in:
  a) User verification page
  b) Admin document approval page
  c) DOCUMENT popup under Admin Center > All Users
- Selfie images are not watermarked.
- PDF previews are unchanged; this request applies to attached document images.
- The watermark is a protected UI overlay on the displayed preview. The original private
  Storage object is not modified.

SQL MIGRATION — REQUIRED
Run:
  supabase/migrations/20261001175500_social_post_boost_and_document_watermark_v8.sql

Supabase CLI option:
  cd D:\project\melochat-web-lite
  npx supabase db push

Then run locally:
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run dev

TYPE CHECK STATUS IN BUILD ENVIRONMENT
- The exact full-project command `npx tsc --noEmit` was started, but this extracted source
  contains many historical *.bak.tsx/source snapshots and the full scan exceeded the
  execution time limit in this environment. It did NOT return a TypeScript error; it timed out.
- A focused TypeScript check using the same project compiler options against all changed TS/TSX
  files and their imports completed successfully with exit code 0.
- TypeScript transpile/syntax validation for all changed TS/TSX files also passed.
- Please run the exact full-project command above after applying the overlay locally.

CHANGED / ADDED FILES
- components/lite/LiteMockExperience.tsx
- components/lite/LiteMockExperience.module.css
- components/feed/socialFeedWebData.ts
- components/verify/VerifyExperience.tsx
- components/verify/VerifyExperience.module.css
- components/settings/AdminVerificationReview.tsx
- components/settings/AdminVerificationReview.module.css
- components/admin/AdminCenter.tsx
- components/admin/AdminCenter.module.css
- supabase/migrations/20261001175500_social_post_boost_and_document_watermark_v8.sql

Backup copies of the pre-edit versions are included under:
- backups/20261001_profile_boost_document_watermark_v8/
