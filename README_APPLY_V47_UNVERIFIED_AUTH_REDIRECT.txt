Melo Chat Lite V47 — Unverified discovery + production auth redirects

Changed behavior
1) Home discovery no longer depends on identity verification. The client always merges current active profiles with legacy dating-RPC results, so newly onboarded/unverified members can appear in Home. Verified state remains a badge/trust signal only.
2) Feed visibility remains based on post visibility (public/friends/etc.), not identity verification. No verification gate was added.
3) Google login/register, email signup confirmation, and password reset now build external auth callbacks from a canonical public origin instead of blindly using window.location.origin. When running on localhost without an explicit site URL, external auth links use https://melochat.me.

Recommended Vercel variable (optional but preferred)
NEXT_PUBLIC_SITE_URL=https://melochat.me

Required Supabase Dashboard Auth configuration
Authentication > URL Configuration
Site URL:
https://melochat.me

Redirect URLs (at minimum):
https://melochat.me/onboarding
https://melochat.me/reset-password

You may also add https://melochat.me/** if that matches your security policy.
Keep localhost redirect URLs only if you intentionally need local OAuth testing.

Commands
npx tsc --noEmit
npm run build
npx vercel --prod

No SQL required for this overlay.
