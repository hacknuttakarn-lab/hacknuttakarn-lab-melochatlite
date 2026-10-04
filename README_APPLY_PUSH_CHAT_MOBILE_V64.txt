Melo Chat Lite — V64

Scope
1) Mobile chat keyboard / iOS visual viewport fix.
2) Activity notifications create canonical public.notifications rows directly.
3) Every direct chat insert is re-attached to the existing V47 notification producer.
4) Web Push transient delivery retries (3 attempts, high urgency, 24h TTL).

Apply
1. Overlay ZIP onto latest project.
2. Run SQL in Supabase SQL Editor:
   supabase/migrations/20261004181500_push_activity_chat_reliability_v64.sql
3. Deploy Edge Function again:
   npx supabase functions deploy send-web-push --no-verify-jwt
4. Run:
   npx tsc --noEmit
5. Redeploy Vercel Production.

Important custom-sound limitation
- While Melo Chat is open, the web app can play:
  /sounds/melo_chat_short_clear_v5.wav
  /sounds/melo_activity_fun_onebeat_v2.wav
- For background/closed/lock-screen Web Push, browsers/OS render the system notification.
  The standard Service Worker showNotification() options do not provide a custom
  audio-file option, so iOS/Android/desktop browsers use the device/browser sound.
  A native iOS/Android wrapper/app is required for guaranteed custom notification sounds.
