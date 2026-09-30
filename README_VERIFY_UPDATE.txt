MELO CHAT LITE — USER VERIFY UPDATE

What changed
- Added User dropdown menu: Verify -> /verify
- Added Verify to the signed-in mobile utility menu.
- Added /verify page with identity details, identity-document upload, selfie upload, and current review status.
- Uses private Supabase Storage bucket: verification-private.
- Added fresh-Supabase SQL migration for verification tables, RLS, storage policies, User submission RPCs, and Admin Review verification RPCs.

IMPORTANT — Supabase new project
Run this SQL in Supabase SQL Editor before testing Verify:
  supabase/migrations/20260927215200_user_verify_bootstrap.sql

Admin access
The SQL expects public.admin_users. If the table does not exist, it creates it.
Add the auth user UUID that should be an admin, for example:

insert into public.admin_users (user_id, role, is_active)
values ('YOUR_AUTH_USER_UUID', 'super_admin', true)
on conflict (user_id) do update set role='super_admin', is_active=true;

Verification flow
User /verify -> verification-private -> verification_identity_details -> verification_requests -> Admin Review Center -> approve/reject/request_info.

Validation
- npm run typecheck: PASS
- Full Next build could not finish in this Linux sandbox because the uploaded node_modules contains no usable Linux Next/SWC binary and the sandbox cannot download @next/swc-linux-x64-gnu. This is an environment limitation, not a TypeScript error.

No other pages/features were intentionally changed.
