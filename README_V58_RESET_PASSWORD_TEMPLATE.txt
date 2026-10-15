Melo Chat Lite V58 — Supabase Reset Password Email Template

IMPORTANT: this dashboard template cannot be changed by the ZIP overlay.
Open Supabase Dashboard -> Authentication -> Emails -> Templates -> Reset Password / Recovery.

Recommended link in the email button:

{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery

Example HTML:

<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">
  Reset password
</a>

Do NOT make the reset button link only to {{ .SiteURL }}.
If you keep using {{ .ConfirmationURL }}, V58 also contains a browser fallback that moves legacy recovery callbacks that land on the root page to /reset-password, but TokenHash is preferred because automated email link scanners cannot consume it merely by opening the Melo Chat landing URL.

Supabase Authentication -> URL Configuration should contain:
Site URL:
https://melochat.me

Redirect URLs:
https://melochat.me/**
https://melochat.me/reset-password
https://melochat.me/onboarding

After changing the email template, request a NEW reset email. Old emails keep the old link.
