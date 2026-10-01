Melo Chat Lite — Admin Activity + Mobile Web Push V3
Source baseline: melochat-web-lite(8).zip + melochat-support-inbox-v2-overlay.zip

WHAT CHANGED
1) Admin Center popup for new admin activity (verification, user report, support notification).
2) Pending badges beside Admin Center menu names: Document approval + User reports. Support unread remains in the top Support Chat menu badge.
3) Web Push infrastructure for Admin/User notifications while the page is closed/backgrounded:
   - Push subscription stored in Supabase
   - Service Worker handles push and notification click
   - Supabase Edge Function sends Web Push from rows inserted into notifications/app_notifications
   - PWA manifest + Apple web-app metadata
4) Users > User detail popup now has a Document button. It opens the latest submitted verification document + selfie using short-lived signed URLs.
5) Pagination is 10 rows/page for Users, Document approval, User reports, Audit log. Existing pagination was preserved where it already existed.

IMPORTANT MOBILE NOTE
Android Chrome/PWA: Web Push works after notification permission is granted.
iPhone/iPad: Web Push requires iOS/iPadOS 16.4+ and the site must be installed to the Home Screen as a web app before notifications can work when the browser/app is closed.

APPLY OVERLAY
Copy the overlay contents on top of the current project.

1. Run SQL
Supabase Dashboard > SQL Editor > run:
supabase/migrations/20261001173000_admin_activity_push_documents.sql

2. Generate VAPID keys (one time)
PowerShell:
npx web-push generate-vapid-keys

You will get Public Key + Private Key.

3. Put PUBLIC key in local/project environment
.env.local:
NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY=<PUBLIC_KEY>

Also add the same environment variable to Vercel/production and redeploy the web app.

4. Set Supabase Edge Function secrets
Choose a long random webhook secret first, for example a 40+ character random value.

PowerShell:
npx supabase secrets set MELO_VAPID_PUBLIC_KEY="<PUBLIC_KEY>"
npx supabase secrets set MELO_VAPID_PRIVATE_KEY="<PRIVATE_KEY>"
npx supabase secrets set MELO_VAPID_SUBJECT="mailto:<YOUR_SUPPORT_EMAIL>"
npx supabase secrets set MELO_PUSH_WEBHOOK_SECRET="<YOUR_RANDOM_SECRET>"

5. Deploy Edge Function
npx supabase functions deploy send-web-push --no-verify-jwt

The function is still protected by the x-melo-webhook-secret header. Do not expose MELO_PUSH_WEBHOOK_SECRET to the browser.

6. Create Database Webhooks in Supabase Dashboard
Database > Webhooks > Create webhook

Webhook A:
- Table: public.notifications
- Event: INSERT
- URL: https://<PROJECT_REF>.supabase.co/functions/v1/send-web-push
- HTTP method: POST
- Header: x-melo-webhook-secret = <YOUR_RANDOM_SECRET>

If your deployed project still writes some legacy notifications to public.app_notifications, add Webhook B with the same settings for:
- Table: public.app_notifications
- Event: INSERT

The Edge Function accepts Supabase Database Webhook payloads and sends the existing notification title/body/href to all active push subscriptions for that recipient.

7. Verify locally
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

TEST CHECKLIST
- Admin: submit a new verification request from another member -> Admin Center popup + notification + Document approval badge.
- Admin: submit a user report -> popup + notification + User reports badge.
- Admin: send a Support message -> Support unread badge + support popup/notification.
- Users page: open a user -> Document -> latest identity document/selfie appear.
- Pagination: Users / Document approval / User reports / Audit log show max 10 items per page.
- Mobile/PWA: grant notifications, background/close the web app, create a notification row for the account -> OS notification appears and opens the supplied href.

TYPECHECK
npx tsc --noEmit = PASS in the prepared source tree.

BUILD NOTE
npm run build was attempted in the ChatGPT container but could not start because the extracted project's local Next.js binary was not executable in this Linux container ("next: Permission denied"). This is an environment/file-permission issue, not a TypeScript error. Run npm run build on your normal Windows project after applying the overlay if you want the production build check as well.
