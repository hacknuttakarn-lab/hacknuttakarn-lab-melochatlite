Melo Chat Lite V39 — User Support Light Theme + Mobile Drawer Safe Scroll

Changed files only:
- app/globals.css
- components/support/SupportChatExperience.module.css

Changes:
1) User Melo Chat Support light mode
   - White/light chat canvas, header and composer
   - Support messages no longer use a dark bubble in Light mode
   - Member messages use a Melo light-blue bubble
   - Translation toggle, borders, timestamps and textarea follow Light theme

2) Mobile hamburger menu (User + Admin Center)
   - Drawer becomes an independent iOS-friendly vertical scroller
   - Uses fixed top/bottom bounds instead of fixed calculated height
   - Adds safe-area/bottom breathing room after Log out
   - Prevents the last menu item from being cut off by the bottom viewport area

No SQL migration.

After overlay:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run build
npm run dev
