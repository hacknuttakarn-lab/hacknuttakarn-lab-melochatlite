Melo Chat Lite — Feed Boost + Google Auth V10
Date: 2026-10-01

BASE
- Continue from current project with V9 overlay already applied.
- No SQL migration is required for V10.

FIX 1 — BOOSTED POST MUST RISE TO TOP OF FEED
Changed: components/feed/socialFeedWebData.ts
- Feed still prefers get_social_feed_boosted when available.
- Compatibility fallback remains for older get_social_feed RPC.
- V10 additionally reads id + boosted_at directly from public.social_posts for returned feed rows.
- The browser hydrates boosted_at and performs final ordering using coalesce(boosted_at, created_at) semantics.
- This fixes the case where Profile correctly shows a boosted post first but Feed is still receiving an older RPC response contract/order.

FIX 2 — GOOGLE LOGIN RAW 400 PAGE
Changed:
- lib/supabase/browser.ts
- app/login/page.tsx
- app/register/page.tsx

Cause seen in screenshot:
  Unsupported provider: provider is not enabled

This is Supabase Auth reporting that the Google provider is disabled for this Supabase project.
V10 now checks GET /auth/v1/settings before redirecting to /auth/v1/authorize.
If external.google != true, the user remains on Melo Chat and sees an in-app TH/EN/DE error instead of a raw Supabase JSON page.

GOOGLE PROVIDER SETUP — REQUIRED ONCE
1) Google Auth Platform / Google Cloud
   - Create/select a Google Cloud project.
   - Configure OAuth consent screen / Audience.
   - Create OAuth Client ID with type: Web application.
   - Authorized JavaScript origins:
       http://localhost:3000
       https://YOUR_PRODUCTION_DOMAIN
   - Authorized redirect URI:
       Use the Callback URL shown in Supabase > Authentication > Sign In / Providers > Google
       It normally has this form:
       https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   - Copy Client ID and Client Secret.

2) Supabase Dashboard
   - Authentication > Sign In / Providers > Google
   - Enable Google provider.
   - Paste Google Client ID and Client Secret.
   - Save.

3) Supabase Authentication > URL Configuration
   - Keep production Site URL as the production website URL.
   - For local development add an allowed Redirect URL such as:
       http://localhost:3000/**
   - Add the production callback destinations/website URLs used by the app.

4) Verify provider configuration
   The public Supabase Auth settings endpoint should report:
     external.google = true

5) Restart local Next.js dev server if needed and test both:
   - /login -> Google
   - /register -> Google

IMPORTANT
- Do NOT put Google Client Secret in NEXT_PUBLIC_* or client code.
- The Client Secret belongs in Supabase provider configuration.
- Google OAuth redirect goes Google -> Supabase callback -> Melo Chat /onboarding.

FILES MODIFIED
- components/feed/socialFeedWebData.ts
- lib/supabase/browser.ts
- app/login/page.tsx
- app/register/page.tsx

BACKUPS
- backups/20261001_feed_boost_google_v10/...

TYPESCRIPT CHECK
The exact command was run against active source after temporarily moving historical backup/overlay folders (which otherwise contain intentionally incomplete old source copies) outside the project scan:
  npx tsc --noEmit
Result: PASS, exit code 0.

For reference, running tsc with those historical backup directories included produces pre-existing module errors inside old backup files such as backups/.../AdminCenter.tsx and old overlay Header.tsx. Active source itself passes.

COMMANDS AFTER OVERLAY
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

No V10 SQL migration is required.
