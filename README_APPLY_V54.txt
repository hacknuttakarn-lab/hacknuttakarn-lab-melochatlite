Melo Chat Lite V54 overlay

Fixes:
1) Profile / Gallery / Post image upload: if Vercel Blob token request or fallback reports Unauthorized, force-refresh the Supabase session once and retry with the new JWT.
2) Admin Center mobile drawer: use the same iOS scroll/height model as the working User Area drawer; neutralize Admin-only body scroll lock and viewport overrides.

No SQL required.
After overlay:
  npm install
  npx tsc --noEmit
Then redeploy Production.
