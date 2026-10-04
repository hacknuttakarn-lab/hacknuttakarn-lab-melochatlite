Melo Chat Lite — V65 Push Recovery / Diagnostics

Purpose:
- Recover Web Push subscriptions if the database row disappears/stales.
- Force periodic subscription re-sync every 5 minutes and on pageshow/online/auth change.
- Prevent send-web-push from failing silently at module startup when a required secret is missing.
- Add clear Edge Function logs for each notification: start, subscription count, sent/failed.
- Add authenticated webhook-secret health action to verify config presence without revealing values.

No SQL required.

After overlay:
1) npx tsc --noEmit
2) npx supabase functions deploy send-web-push --no-verify-jwt
3) Redeploy Vercel Production
4) Open Melo Chat once on the receiving device while signed in and Notification permission is granted.
5) Wait a few seconds, then background/lock and send a test message.

Optional health test (use the same secret already stored as MELO_PUSH_WEBHOOK_SECRET):
POST https://<PROJECT_REF>.supabase.co/functions/v1/send-web-push
Header: x-melo-webhook-secret: <same secret>
JSON body: {"action":"health"}

Expected:
{"ok":true,"config":{"supabaseUrl":true,"serviceRole":true,"vapidPublic":true,"vapidPrivate":true,"webhookSecret":true,"vapidSubject":true}}

Important:
- NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY in Vercel MUST be the same public key as MELO_VAPID_PUBLIC_KEY in Supabase.
- If the health response shows vapidPublic/vapidPrivate false, set those Supabase secrets and redeploy the function.
