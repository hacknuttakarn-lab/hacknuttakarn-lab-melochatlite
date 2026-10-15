Melo Chat Lite V56 overlay

Changes:
1) Chat list: verified badge appears after member name/age for verified users.
2) Unverified direct-chat safety notice is pinned between the conversation header and message list and disappears once verification is approved.
3) Auto translation follows the signed-in user's profiles.primary_language only. Translation requests refresh auth session and retry once on HTTP 401. Server quota calculation accepts both total and component usage fields.
4) Home recommendation gender filtering now normalizes TH/EN/DE values and supports onboarding's historical looking_for storage when interested_genders is not yet populated.

No SQL required.
Run:
  npx tsc --noEmit
  npm run build
  npx vercel --prod
