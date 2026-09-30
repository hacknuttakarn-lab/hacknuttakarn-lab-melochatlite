Melo Chat Lite/Web - Admin Verification Review overlay

1) Copy this overlay over the project root.
2) Supabase SQL Editor: run supabase/migrations/20260927233000_admin_verification_review_ui.sql
   (Run the previous 20260927221500_user_identity_verification.sql first if it has not been run yet.)
3) npm run typecheck
4) npm run dev

Scope only:
- themed Document type dropdown on /verify
- redesigned Admin Review Center verification queue/detail/review actions
- reject reason returned to user via reviewer_notes
- admin private-storage read policy and richer verification queue RPC

No unrelated pages were intentionally changed.
