Melo Chat Lite - Admin Delete Guard / 90-day deletion

Changed:
- components/admin/AdminCenter.tsx
- components/admin/AdminCenter.module.css
- supabase/migrations/20260930223000_admin_guarded_user_deletion.sql

Behavior:
- Admin Delete requires exact confirmation: DELETE <Member ID>, e.g. DELETE ME000003.
- Deletion reason is mandatory and stored in Audit Log.
- Account is scheduled for permanent deletion after 90 days, not immediately.
- Existing Cancel deletion remains available during the waiting period.
- User self-deletion 7-day flow is not changed.

Required:
1. Overlay files on the project.
2. Run the new SQL migration in Supabase SQL Editor (or your normal migration process).
3. npx tsc --noEmit
4. npm run dev

TypeScript check performed on this source: PASS.
