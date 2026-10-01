Melo Chat Lite — Admin / Support Notification V5
Date: 2026-10-01

Base used
- melochat-web-lite(8).zip
- Support Inbox V2
- Admin Activity / Push V3
- Admin Notify / Verify / Support Translation V4

Changes in this overlay
1) Admin Center Bell / Popup
   - Admin header now also derives actionable notification rows directly from the existing pending verification queue and open user-report queue.
   - This is intentionally independent of the notification trigger, so pending Admin work appears in the Bell even on deployments where older notification rows were not inserted correctly.
   - New queue items are detected by the existing header refresh and can trigger the Admin activity popup.

2) User Support notification
   - New Admin replies create a notification for the member:
     "มีการตอบกลับจาก Melo Chat Support"
     "ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน"
   - href is /support/chat, never Direct Chat.
   - Uses the existing public.notifications table.

3) User verification decision notification
   - approved -> verification_approved
   - rejected -> verification_rejected
   - more_info / needs_info -> verification_needs_info
   - Notification opens /verify.

4) Admin Melo Chat Support translation
   - Adds the same translation setting model used by user chat/support.
   - Reads the Admin profile primary_language and auto_translation_enabled.
   - Translation toggle is shown in the selected-member header.
   - Incoming member messages are translated to the Admin primary language.
   - Original message remains available below translated text.
   - Uses /api/translate and the existing Translation setting; no new translation service was added.

5) Existing Support Composer behavior retained
   - textarea auto grows up to 7 lines
   - overflow after 7 lines uses internal scrollbar
   - Send button remains fixed at the footer side
   - Saved Reply behavior unchanged

SQL REQUIRED
Run:
  supabase/migrations/20261001213000_admin_support_user_notifications_v5.sql

The migration:
- reuses support_threads, support_messages, verification_requests, user_reports, admin_users, notifications
- DOES NOT create duplicate Support conversation/message tables
- replaces old fragile support notification insertion with a compatibility insert that preserves notification table defaults
- adds verification decision notification trigger
- keeps Admin submission/report triggers
- backfills currently unread Admin->Support messages into user notifications

Supabase SQL Editor
1. Open SQL Editor
2. Paste contents of:
   supabase/migrations/20261001213000_admin_support_user_notifications_v5.sql
3. Run once

Or with linked Supabase CLI:
  cd D:\project\melochat-web-lite
  npx supabase db push

Then run:
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run dev

TypeScript verification performed on the edited project:
  npx tsc --noEmit
Result: PASS (exit code 0)

Recommended checks
A. Admin Center
   - Submit a new Verify request as member.
   - Admin Bell should show pending verification.
   - Admin Center menu badge should still work.
   - Submit a user report.
   - Admin Bell should show pending report.
   - A newly appearing pending item while Admin Center is already open should produce the activity popup.

B. Support notification to member
   - Admin sends a new Support reply.
   - Member Bell shows "มีการตอบกลับจาก Melo Chat Support".
   - Clicking it opens /support/chat.

C. Verification notification to member
   - Admin approves/rejects a Verify request.
   - Member Bell shows the verification result.
   - Clicking it opens /verify.

D. Admin Support Translation
   - Set Admin primary chat language in Settings.
   - Open Admin Support Inbox.
   - Turn Translation on.
   - Incoming member message should display translated text with Original below when translation differs.
