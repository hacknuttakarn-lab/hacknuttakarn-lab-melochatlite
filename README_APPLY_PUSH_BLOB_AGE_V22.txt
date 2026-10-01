Melo Chat Lite — V22 Push + Vercel Blob + Minimum Age 20

GOALS
- Desktop + Mobile: OS Web Push while the page is backgrounded/closed (after permission + platform requirements).
- Vercel Blob for member-visible profile/cover/post images.
- Database-level minimum age: 20 full years.

1) APPLY FILES
Copy this overlay on top of the current project.

2) INSTALL VERCEL BLOB SDK
PowerShell:
cd D:\project\melochat-web-lite
npm install @vercel/blob@^2.3.0

3) CREATE / CONNECT A VERCEL BLOB STORE
Vercel Dashboard > Project > Storage > Create Database > Blob
Use a PUBLIC Blob store for profile/cover/post media.
Connect it to the Melo Chat project.

Set this environment variable locally and in Vercel:
NEXT_PUBLIC_MELO_IMAGE_STORAGE=vercel_blob

For local development, after linking the Vercel project:
vercel link
vercel env pull .env.local

Do NOT expose BLOB_READ_WRITE_TOKEN with NEXT_PUBLIC_. The /api/blob/image route is server-side and validates the Supabase access token before it uploads/deletes.

Existing Supabase image paths continue to render. New Profile/Cover/Post uploads use Vercel Blob once NEXT_PUBLIC_MELO_IMAGE_STORAGE=vercel_blob is enabled.

SECURITY NOTE
- Identity verification files remain in the existing private Supabase bucket verification-private.
- Chat/support media also remain on the existing protected storage path in V22.
This avoids moving private conversation/identity media into a public Blob store. A separate PRIVATE Vercel Blob store can be added later if desired.

4) RUN DATABASE MIGRATION
Run:
supabase/migrations/20261001223000_push_age_blob_v22.sql

CLI:
cd D:\project\melochat-web-lite
npx supabase db push

The migration:
- keeps web_push_subscriptions in DB
- adds register_my_web_push_subscription() so one browser endpoint is safely reassigned to the currently logged-in Melo account
- enforces age >= 20 at the profiles table level
- recreates Support notification rows so Support replies can trigger server-side Web Push

5) WEB PUSH — REQUIRED ONE-TIME SETUP
Generate VAPID keys if not already done:
npx web-push generate-vapid-keys

Web app env (.env.local + Vercel):
NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY=<PUBLIC_KEY>

Supabase Edge Function secrets:
npx supabase secrets set MELO_VAPID_PUBLIC_KEY="<PUBLIC_KEY>"
npx supabase secrets set MELO_VAPID_PRIVATE_KEY="<PRIVATE_KEY>"
npx supabase secrets set MELO_VAPID_SUBJECT="mailto:<YOUR_SUPPORT_EMAIL>"
npx supabase secrets set MELO_PUSH_WEBHOOK_SECRET="<LONG_RANDOM_SECRET>"

Deploy:
npx supabase functions deploy send-web-push --no-verify-jwt

6) DATABASE WEBHOOKS — REQUIRED
Supabase Dashboard > Database > Webhooks

Webhook A
- Table: public.notifications
- Event: INSERT
- Method: POST
- URL: https://<PROJECT_REF>.supabase.co/functions/v1/send-web-push
- Header: x-melo-webhook-secret = <MELO_PUSH_WEBHOOK_SECRET>

Webhook B (keep this if your Direct/Match activity pipeline uses the legacy table)
- Table: public.app_notifications
- Event: INSERT
- Same URL/header as above

Without these webhooks, Realtime notifications still work while the page is open, but closed/locked Web Push will not be dispatched.

7) MOBILE PUSH REQUIREMENTS
Android Chrome / installed PWA:
- Notification permission must be Allowed.
- Do not Force Stop Chrome/PWA and do not disable OS notifications.

iPhone/iPad:
- iOS/iPadOS 16.4+
- Melo Chat must be Add to Home Screen / installed as a web app
- Notifications must be Allowed from that installed web app

No web application can bypass a user's OS notification permission, browser force-stop, Focus/Do Not Disturb, or vendor battery restrictions.

8) AGE 20+
- Register page now asks Date of Birth before Email or Google registration begins.
- UI blocks dates younger than 20 full years.
- Google flow carries the entered DOB into Onboarding via session storage.
- Email sign-up stores DOB in user metadata for Onboarding prefill.
- Database trigger rejects an under-20 date even if someone bypasses the UI/API.
- A user cannot complete onboarding without date_of_birth.

9) TEST
Desktop:
- allow notifications
- login, then close the tab
- send a Support reply / create a notification row from another account
- OS notification should appear

Android:
- allow notifications
- background or close the PWA/browser tab and lock screen
- send a new notification
- check lock-screen notification

iOS:
- install to Home Screen first, allow notifications, then lock screen and test

Blob:
- upload new profile photo / cover / post image
- DB value for new public media should be a https://*.public.blob.vercel-storage.com/... URL
- older Supabase images should still display

Age:
- DOB younger than 20 => Register/Onboarding blocked
- DOB exactly 20 today => accepted
- attempt profile PATCH with under-20 date => DB returns AGE_RESTRICTION_20

10) CHECK
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Prepared verification in ChatGPT environment:
- Focused TypeScript check for all modified TS/TSX files: PASS (Exit Code 0).
- Full project check was not used as the final proof because the working archive contains historical overlay/backup source copies and @vercel/blob cannot be installed in the offline build container. Run the two commands above after npm install on the real project.
