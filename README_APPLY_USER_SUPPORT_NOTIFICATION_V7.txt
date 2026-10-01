Melo Chat Lite - USER Support Notification V7
Date: 2026-10-01

Purpose
- Fix USER Notification Bell not showing new replies from Melo Chat Support.
- Keep Support Chat data separate from Direct/Match Chat to avoid breaking matching/chat logic.
- Reuse the same Header notification UX and chat sound behavior.

What changed
1) Header now reads the current user's Support thread/messages directly from:
   - public.support_threads
   - public.support_messages
   using the existing RLS from the Support Chat system.
2) Every admin reply can appear in the USER notification drawer as:
   - "มีการตอบกลับจาก Melo Chat Support"
   - "ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน"
3) Clicking the notification:
   - calls existing RPC support_mark_my_thread_read(...)
   - refreshes Support unread state
   - opens /support/chat
4) Existing V6 system-feed notification remains as fallback, but direct Support rows take precedence to avoid duplicates.
5) Existing Support Realtime listener remains active. New admin Support messages refresh the Bell immediately and play the Melo chat sound once.
6) No Support data is merged into Direct Chat / Match Chat tables.

Files changed
- components/Header.tsx

Backup
- backups/20261001_user_support_notification_v7/components/Header.tsx

SQL
- No new SQL migration in V7.
- V7 reuses the existing Support migration/RPC from Support Inbox V2:
  support_mark_my_thread_read(uuid)
  and the existing support_messages.read_at column.

Commands
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

TypeScript check performed on the composed latest project before packaging:
PASS - npx tsc --noEmit (exit code 0)

Recommended test
1. Login as USER and keep any normal page open.
2. Login as Admin in another browser/account.
3. Send a new Support reply from Admin Support Inbox.
4. USER Bell badge should increase without opening /support/chat first.
5. Open Bell: "มีการตอบกลับจาก Melo Chat Support" should be visible.
6. Click it: browser opens /support/chat.
7. The Support unread state should be marked read and Bell count should reduce on refresh/realtime update.
