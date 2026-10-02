Melo Chat Lite V33

Changes
- Removed the implicit Admin Unlimited plan override.
- Admin/Super Admin user-area features and quotas now follow the package assigned to that account.
- Removed Boost priority from the Admin Center package editor UI.
- Package save keeps the existing RPC signature and writes boost priority as 0.
- Removed the Admin Unlimited-only note from My Plan / Usage.

Important
- Admin Center administrative access/permissions are not removed by this change.
- Support Chat translation behavior remains separate from normal User Area translation.

Apply
1) Overlay these files on the project.
2) Run:
   npx supabase db push
   npx tsc --noEmit
   npm run build
   npm run dev
