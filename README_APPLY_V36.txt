Melo Chat Lite — V36 Mobile Admin Center layout fix

Changed only:
- components/admin/AdminCenter.module.css

Mobile only (<=700px):
- Hide the embedded Admin Center sidebar.
- Keep the hamburger/AppShell menu as the only admin navigation on mobile.
- Force Admin Center content to a single full-width mobile column.
- Keep wide admin tables scrollable inside their own container instead of widening the page.
- Preserve mobile bottom safe area.

No SQL migration.

After overlay:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run build
npm run dev
