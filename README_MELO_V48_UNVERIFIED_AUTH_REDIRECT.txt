Melo Chat Lite V48 — unverified discovery + auth redirect hardening

Apply overlay, then run:
1) Supabase SQL Editor: supabase/migrations/20261014161000_unverified_discovery_auth_redirect_v48.sql
2) npx tsc --noEmit
3) npm run build
4) npx vercel --prod

Required Supabase Dashboard setting (cannot be changed by project SQL):
Authentication > URL Configuration
Site URL: https://melochat.me
Redirect URLs:
- https://melochat.me/onboarding
- https://melochat.me/reset-password
- https://melochat.me/**

Recommended Vercel variable:
NEXT_PUBLIC_SITE_URL=https://melochat.me

V48 code rejects localhost/127.0.0.1/0.0.0.0 for Google OAuth and password-reset redirect_to, even if an old public env value contains localhost.
