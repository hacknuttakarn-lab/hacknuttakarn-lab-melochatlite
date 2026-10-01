Melo Chat Lite — Mobile Home spacing + AdminCenter runtime fix V20

Changes
1) Mobile Home
   - Removed obsolete 60px bottom padding from headingRow after Boost Profile launcher was moved above the bottom navigation.
   - Reduced the top margin before lifestyle/category chips.
   - Keeps desktop/tablet layout unchanged.

2) Admin Center runtime fix
   - Fixes: ReferenceError: Cannot access 'tabVisible' before initialization
   - Moves can()/tabVisible() above the effects/early returns so effects never close over an uninitialized binding.

Files
- components/home/HomeDashboardExperience.module.css
- components/admin/AdminCenter.tsx

SQL
- None.

Commands
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Validation performed
- Full TypeScript including historical backup/overlay source copies reports pre-existing errors from those old copies (missing relative dependencies).
- Active-source TypeScript was run after temporarily excluding those historical folders; the validation environment timed out before tsc returned and printed no diagnostic before timeout.
- AdminCenter.tsx was additionally checked with TypeScript transpileModule: PASS.
