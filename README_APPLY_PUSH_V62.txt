Melo Chat Lite — V62 Closed/Locked Web Push Fix

Problem confirmed
-----------------
The project already created notification rows and already had a send-web-push Edge Function,
but the source archive does not contain the V45 dispatcher migration referenced by V47.
Without a server-side notifications -> Edge Function dispatcher, Realtime works only while
the web app is open. When the page is closed/backgrounded or the phone is locked, there is
nothing on the server that actually sends Web Push.

V62 fixes
---------
1. Adds a durable PostgreSQL trigger on public.notifications.
2. Trigger uses pg_net to call send-web-push for every new canonical notification.
3. URL + shared secret are read from Supabase Vault (not exposed to browser/client code).
4. Global client push registration now runs on every signed-in route, not just Header pages.
5. Automatically rebuilds stale browser subscriptions if the VAPID public key changed.
6. Service Worker uses skipWaiting + clients.claim so updates become active immediately.
7. Direct-chat push follows the actual allowed message. Existing matched conversations can
   keep receiving chat notifications after Premium/Premium+ expires.
8. Push badge count is based on unread public.notifications rows.

Files
-----
lib/notificationsWebPush.ts
components/SiteProviders.tsx
public/melo-notifications-sw.js
supabase/functions/send-web-push/index.ts
supabase/migrations/20261004170000_web_push_dispatcher_v62.sql
supabase/SETUP_PUSH_VAULT_V62.sql

Required deployment order
-------------------------
A) Choose ONE long random secret, then set it on the Edge Function:
   npx supabase secrets set MELO_PUSH_WEBHOOK_SECRET="YOUR_LONG_RANDOM_SECRET"

B) Confirm existing VAPID secrets are present on Supabase Edge Functions:
   MELO_VAPID_PUBLIC_KEY
   MELO_VAPID_PRIVATE_KEY
   MELO_VAPID_SUBJECT

C) Deploy the Edge Function:
   npx supabase functions deploy send-web-push --no-verify-jwt

D) Edit supabase/SETUP_PUSH_VAULT_V62.sql:
   - replace YOUR_PROJECT_REF
   - replace the webhook-secret placeholder with EXACTLY the same secret from step A
   Run it once in Supabase SQL Editor.

E) Run migration in Supabase SQL Editor:
   supabase/migrations/20261004170000_web_push_dispatcher_v62.sql

F) Vercel still needs:
   NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY=<same public VAPID key>

G) Deploy the web overlay, then run:
   npx tsc --noEmit

H) Test after deployment:
   - Sign out/in once.
   - Browser notification permission must be Allow.
   - Send a Direct Chat message from account A to account B while B is not on the page.
   - Send an activity notification (follow/like/etc.).
   - Verify both arrive while desktop browser is backgrounded/closed.

Important iPhone/iPad note
--------------------------
On iOS/iPadOS, Web Push is delivered to a website installed as a Home Screen web app (PWA).
Open Melo Chat in Safari -> Share -> Add to Home Screen, launch the installed Melo Chat icon,
then allow Notifications. A normal Safari tab is not equivalent to an installed Home Screen
web app for locked-screen Web Push.

No Stripe/package SQL is changed by V62.
