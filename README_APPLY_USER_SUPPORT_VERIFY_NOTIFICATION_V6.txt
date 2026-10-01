Melo Chat Lite — User Support + Verification Notification V6
============================================================

This overlay fixes the two USER notification cases that were still missing:
1) Admin reply from Melo Chat Support -> USER bell notification -> /support/chat
2) Verification approved / rejected / more-info -> USER bell notification -> /verify

Why this V6 is different
------------------------
Previous migrations attempted to write into public.notifications. The deployed
notifications table can differ between older Melo schema revisions, which can
make those secondary inserts fail silently while normal Like/Comment alerts keep working.

V6 derives these two notification types directly from their source-of-truth tables:
- support_messages / support_threads
- verification_requests

This means the Header does not depend on the legacy notification table shape for
these two events. Read/unread state is still stored in the database:
- Support: support_messages.read_at
- Verification: verification_requests.decision_notification_read_at

Files
-----
components/Header.tsx
supabase/migrations/20261001224500_user_system_notification_feed_v6.sql

Required database step
----------------------
Run the migration before testing the new UI.

Option A — Supabase SQL Editor:
Open and run:
supabase/migrations/20261001224500_user_system_notification_feed_v6.sql

Option B — Supabase CLI (project already linked):
cd D:\project\melochat-web-lite
npx supabase db push

Then check/run locally:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Expected test cases
-------------------
A. Support reply
1. Login as USER and keep normal Melo page open.
2. Admin replies in Melo Chat Support.
3. USER bell badge increases and a new entry appears:
   "มีการตอบกลับจาก Melo Chat Support"
   "ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน"
4. Clicking the entry opens /support/chat.
5. Opening Support Chat marks the support reply read in DB.

B. Verification approved/rejected
1. USER submits verification.
2. Admin Approve or Rejects it.
3. USER bell shows the corresponding verification notification.
4. Clicking it opens /verify and marks that decision notification read.
5. A later new decision resets it to unread again.

Realtime
--------
Header also subscribes to Support realtime events on the USER side. A new admin
support message refreshes the notification feed immediately and uses the existing
Melo chat sound. The existing 5-second Header refresh remains only as a fallback.

TypeScript validation
---------------------
Executed against the merged current project:
npx tsc --noEmit
Result: PASS (exit code 0)
