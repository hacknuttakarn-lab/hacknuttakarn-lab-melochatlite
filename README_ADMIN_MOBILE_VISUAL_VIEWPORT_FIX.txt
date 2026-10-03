Melo Chat Lite — Admin Center Mobile Drawer VisualViewport Fix
Date: 2026-10-03

Scope
- Fix only the Admin Center left mobile menu after deployment.
- Keep Logout reachable and keep the drawer visually attached to the visible bottom edge.
- No SQL.
- No changes to Support Chat, package system, Stripe, user area, translation, notifications, or entitlements.

Changed files
- components/Header.tsx
- app/globals.css

What changed
- While the Admin mobile menu is open, Header.tsx reads window.visualViewport.height and offsetTop.
- CSS uses those values for the Admin drawer and backdrop instead of trusting only 100dvh.
- Adds bottom safe-area/scroll padding for Logout.
- Applies only below 760px and only while the Admin Center menu is open.

After overlay
npm install
npx tsc --noEmit

TypeScript check in the provided sandbox could not be completed because the source ZIP did not contain node_modules and npm install timed out before @types/node/@types/react/@types/react-dom were installed. The change itself uses standard DOM VisualViewport APIs available in the configured TypeScript DOM library.
