Melo Chat Lite — Mobile Layout V18

Changes
1) Admin Center: hides the in-page left sidebar on <=900px. Mobile hamburger admin menu remains the navigation source.
2) Home: Boost Profile button is fixed above the mobile bottom navigation.
3) Home: Boost Profile popup is centered on mobile instead of bottom-sheet aligned.
4) Feed/Profile post Create/Edit composer popup is centered on mobile.
5) Post owner three-dot dropdown opens upward on mobile so bottom navigation does not cover Boost/Edit/Delete.
6) Feed page title/header is hidden on mobile only.

No SQL migration required.

Commands:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Validation note:
The edited TSX files were syntax-transpiled with TypeScript successfully. A full-project tsc in the available reconstructed workspace could not be treated as authoritative because that workspace contains old overlay folders and missing Next/React dependencies; run the command above in the real project root after overlaying.
