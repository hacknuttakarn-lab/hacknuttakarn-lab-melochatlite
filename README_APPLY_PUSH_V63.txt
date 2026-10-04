Melo Chat Lite — V63 Activity Push + Every Chat Push

What V63 changes
- Adds server-side activity notifications for:
  - Follow
  - Interested / profile like
  - Match
  - Post like
  - Post comment
- Every notification row, including every direct chat message, receives its own unique Web Push tag.
- Keeps the existing V62 closed-app dispatcher and push subscriptions.

Sound behavior
- When Melo Chat is open, the project already uses:
  /sounds/melo_chat_short_clear_v5.wav for chat
  /sounds/melo_activity_fun_onebeat_v2.wav for activity
- Standard browser/PWA Web Push on a locked/background device does NOT expose a web API for choosing a custom notification sound. The OS/browser chooses that sound. V63 includes a soundHint in push data for future native wrappers, but it cannot force the custom WAV on iOS/desktop Web Push.

Apply
1) Overlay this ZIP.
2) Run in Supabase SQL Editor:
   supabase/migrations/20261004174500_activity_push_every_chat_v63.sql
3) Redeploy Edge Function because send-web-push changed:
   npx supabase functions deploy send-web-push --no-verify-jwt
4) Run:
   npx tsc --noEmit
5) Redeploy Vercel Production.

No new environment variables are required.
