Melo Chat Lite V35 - Admin Center pending badge restore

Changed:
- components/admin/AdminCenter.module.css

Fix:
- Restores menu pending counters as separate badges aligned to the right.
- Prevents labels such as "รายงานผู้ใช้2".
- Keeps active/inactive menu styling and responsive behavior.

No SQL migration required.

Run:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run build
npm run dev
