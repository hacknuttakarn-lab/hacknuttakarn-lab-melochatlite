Melo Chat Lite V37 — package visibility + light theme + persistent session

WHAT CHANGED
1) Admin package visibility is separated from Admin Center availability.
   - New packages are saved in Admin Center even when hidden from users.
   - The old "Active / show on Premium" checkbox is removed from New/Edit package.
   - Package cards now have a separate User visibility toggle.
   - Hidden packages remain manageable and assignable by Admin Center.
2) User page heading Premium -> Package / แพ็กเกต / Pakete.
3) Light mode fixes for Connect upgrade panel and Packages page.
4) The Connect upgrade button follows the Melo theme and is localized.
5) Production diagnostics is removed from Settings menu.
6) Auth session persistence is strengthened:
   - no idle/inactivity logout is introduced;
   - session refresh is checked every minute and again on focus/visibility;
   - transient refresh/network failure no longer immediately behaves like logout.
   Supabase can still invalidate a refresh token for security/account reasons.

SQL MIGRATION
supabase/migrations/20261002202000_package_visibility_session_v37.sql

IMPORTANT
Run the SQL migration before testing package visibility. The User Packages query now uses
subscription_plans.show_on_user_packages.

COMMANDS
cd D:\project\melochat-web-lite
npx supabase db push
npx tsc --noEmit
npm run build
npm run dev

TYPECHECK DURING ASSEMBLY
The full project typecheck was executed in the assembly environment. The source passes after
providing a temporary type declaration for @vercel/blob because that npm package is not installed
inside this sandbox. Your real project already uses @vercel/blob; run npx tsc --noEmit locally
for the authoritative result.
