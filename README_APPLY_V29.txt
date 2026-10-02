Melo Chat Lite V29 — Admin package display + themed language menu

Changes
1) Admin Center > Packages: split view into Packages / Translation.
2) Packages: add 1 / 3 / 6 month preview controls and show all three prices on each plan card.
3) Signed-in User/Admin header language selector: replace native OS select with Melo themed custom menu.
4) Responsive Dark/Light behavior retained.

No SQL migration in V29.

Run after overlay:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run build
npm run dev

Validation in build workspace:
- Header.tsx syntax transpile: PASS
- AdminCenter.tsx syntax transpile: PASS
- Full tsc was attempted but the available reconstructed snapshot still lacks existing dependencies/modules from earlier overlays (@vercel/blob, lib/supabase/realtime, lib/notificationsWebPush, newer browser helpers). Those are pre-existing snapshot dependency errors, not introduced by V29.
