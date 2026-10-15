MELO CHAT LITE V51 — RESET PASSWORD TOKEN HASH

IMPORTANT: after applying this overlay, update the Supabase Recovery email template.

Supabase Dashboard:
Authentication -> Emails -> Templates -> Reset password / Recovery

Keep your current email design/text, but change the Reset password button/link href to:

{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery

Example:
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>

Why:
- The email now opens Melo Chat directly.
- A normal GET request from an email scanner does NOT verify/consume the one-time recovery token.
- Melo Chat verifies token_hash only when the real user submits the new password form.

Keep Supabase URL Configuration:
Site URL: https://melochat.me
Redirect URLs:
https://melochat.me/**
https://melochat.me/onboarding
https://melochat.me/reset-password

No SQL is required.
No new environment variable is required.

After overlay:
npx tsc --noEmit
npm run build
npx vercel --prod

Then request a NEW password-reset email. Existing emails keep the old template/link.
