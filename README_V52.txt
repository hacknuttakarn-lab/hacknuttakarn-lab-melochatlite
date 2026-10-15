Melo Chat Lite V52

Changes
- Normalize email to lowercase for password sign-in / signup / password reset.
- Localized friendly login errors for invalid credentials and unconfirmed email.
- Updated SEO metadata to current Melo Chat Lite dating/match/feed/chat/translation/verification product.
- Added canonical URL, Open Graph, Twitter metadata, JSON-LD WebSite schema.
- Added robots.ts and sitemap.ts.
- Updated PWA manifest description.

No SQL required.
No new environment variables required.

Run:
npx tsc --noEmit
npm run build
npx vercel --prod

Note: Google search title/snippet updates are not immediate and are ultimately chosen by Google. After deploy, request reindexing of https://melochat.me in Google Search Console if available.
