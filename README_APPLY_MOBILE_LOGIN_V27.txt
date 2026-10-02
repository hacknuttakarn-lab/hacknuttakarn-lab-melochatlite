Melo Chat Lite — V27 Mobile Landing / Composer / Login language polish

Changes
1) Mobile public landing page
   - Prevents horizontal overflow/clipping.
   - Centers and scales the phone mockup inside the viewport.
   - Reduces hero typography and spacing on narrow phones.

2) Mobile Create Post / Edit Post
   - Moves the modal higher.
   - Adds more bottom breathing room for Cancel/Post buttons and safe area.

3) Desktop Login/Register
   - Hides the legacy floating language selector below the Header.
   - Keeps the language selector in the top Header.

Files
- app/globals.css
- components/lite/LiteMockExperience.module.css

No SQL migration.

Run after overlay:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run build
npm run dev
