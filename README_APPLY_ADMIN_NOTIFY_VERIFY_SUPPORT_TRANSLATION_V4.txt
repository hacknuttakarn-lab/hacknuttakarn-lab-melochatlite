Melo Chat Lite — Admin Notify + Verify Badge + Support Translation + Persistent Session V4
Date: 2026-10-01

Base expected:
- melochat-web-lite(8).zip
- Support Inbox V2 overlay
- Admin Activity + Push V3 overlay

Changes in this overlay
1) Admin Center activity notifications
- Fixes the DB notification insert used by verification submissions and user reports.
- The older generic jsonb_populate_record insert could bypass column defaults (for example notification id defaults) and fail silently inside the trigger.
- Adds public.melo_insert_notification_compat(...) which inserts only columns that actually exist in public.notifications so DB defaults remain active.
- Replaces the verification/report trigger with the compatibility insert.
- Backfills currently pending verification/report activity (up to 20 each/admin) so Admin Notification is not empty immediately after upgrade.
- Existing Admin Center menu pending-count badges and popup from V3 are reused; no Direct Chat/Match Chat logic changed.

2) Verified checkmark on own Profile
- /profile now resolves the current user's verification using both the loaded verification row and get_public_identity_verification().
- The checkmark is displayed for the owner too, not only for public profiles.
- Admin-approved verification remains the source of truth.

3) Melo Chat Support translation
- User Support Chat now uses the same Chat Translation preference as normal Chat.
- Reads profiles.primary_language + profiles.auto_translation_enabled.
- Translation toggle is synced via melo-chat-translation-enabled and melo-chat-translation-setting-changed.
- Incoming Admin/Support text is translated through /api/translate.
- Sender's original text remains available below the translated text when translation actually changed the message.
- Does not translate the user's own outgoing message.
- Composer auto-resize maximum 7 lines is preserved.

4) Automatic logout / inactivity
- No idle/inactivity logout timer was found in the current project.
- Auth session is stored in localStorage and refreshes with Supabase refresh_token.
- V4 hardens auth so a transient 401/refresh failure does NOT clear the browser session.
- Browser session is cleared only if Supabase explicitly reports the refresh token is invalid/expired/revoked, or the user clicks Logout.
- Note: server-side revocation/deleted account cannot be overridden by the client.

SQL to run
Run this migration after previous migrations:
  supabase/migrations/20261001193000_admin_notifications_verify_badge_session_v4.sql

Option A — Supabase SQL Editor
- Open Supabase Dashboard -> SQL Editor.
- Paste the migration and Run.

Option B — Supabase CLI (project already linked)
  cd D:\project\melochat-web-lite
  npx supabase db push

Files changed/added
- components/lite/LiteMockExperience.tsx
- components/support/SupportChatExperience.tsx
- components/support/SupportChatExperience.module.css
- lib/supabase/browser.ts
- supabase/migrations/20261001193000_admin_notifications_verify_badge_session_v4.sql

Backups
- backups/20261001_support_admin_verify_translation_session_v4/

Validation actually performed
  npx tsc --noEmit
Result: PASS (exit code 0, no TypeScript errors)

After applying overlay
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run dev

Suggested checks
1. Admin logged in -> submit a new Verify request from a member -> bell + popup + Admin Center review badge.
2. Submit a user report -> bell + popup + reports pending badge.
3. Approve Verify -> reload /profile for that member -> checkmark appears after name.
4. Settings -> choose Primary Chat Language and Auto Translation -> open /support/chat -> support replies use same translation setting.
5. Close/reopen browser -> user remains signed in as long as the Supabase refresh token is still valid and not revoked.
