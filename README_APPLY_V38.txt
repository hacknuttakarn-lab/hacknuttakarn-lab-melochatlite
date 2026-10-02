Melo Chat Lite V38 — package soft delete + Light Settings polish

Changes
1) Admin Center > Packages: adds "Delete package" / "Remove package".
   This is a SOFT DELETE (archive), not a physical DB delete.
   - Removed package disappears from Admin package catalog.
   - Removed package is hidden from User Packages page.
   - Removed package cannot be newly assigned.
   - Existing active subscribers KEEP all package rights until subscription expiry or replacement.
   - Free package cannot be deleted because it is the system fallback.
2) User Settings / Personal Profile: explicit Light theme styling.
   Fixes light mode even when the device OS itself is set to Dark.

SQL migration
supabase/migrations/20261002211500_archive_packages_keep_subscribers_v38.sql

Apply
cd D:\project\melochat-web-lite
npx supabase db push
npx tsc --noEmit
npm run build
npm run dev
