Melo Chat Lite — Mobile Layout V19
==================================

Apply this ZIP on top of the latest project that already includes V18.

Changes (mobile only)
---------------------
1) Home content begins closer to the header.
2) Create Post / Edit Post modal uses true viewport-centered flex positioning with safe-area space above and below.
3) Profile page hides the word "Profile" on mobile while keeping the MELO CHAT LITE eyebrow.
4) Connect page hides the "Connect" page heading on mobile.
5) In Admin Center mobile header, the top language control is replaced by "Support chat" and opens the existing Admin Support drawer. Language selection remains in the hamburger menu.

No SQL migration is required.

Files changed
-------------
app/globals.css
components/Header.tsx
components/home/HomeDashboardExperience.module.css
components/lite/LiteMockExperience.module.css
components/lite/LiteMockExperience.tsx

Backups
-------
Original pre-V19 versions are included under:
backups/20261001_mobile_layout_v19/

Run after applying
------------------
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Validation performed
--------------------
- TypeScript syntax transpile check: PASS for Header.tsx and LiteMockExperience.tsx.
- Full `npx tsc --noEmit --pretty false` was started against a reconstructed project with overlays V2–V18 + V19. It produced no diagnostic output before the execution environment timed out at 120 seconds, so this README does NOT claim a full-project TypeScript pass.
