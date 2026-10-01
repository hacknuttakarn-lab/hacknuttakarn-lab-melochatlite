Melo Chat Lite — Support Inbox V2 Overlay
Source inspected: uploaded melochat-web-lite(8).zip

WHAT CHANGED
- Real member avatar + name/email/package in Admin Support Inbox.
- Persistent support unread counts using support_messages.read_at.
- Supabase Realtime for member/admin support messages; no support-message polling.
- Admin support chat sound uses /public/sounds/melo_chat_short_clear_v5.wav.
- Support notifications route Admin -> selected Support thread and User -> /support/chat.
- User always sees Melo Chat Support identity; admin responder identity is not exposed.
- Shared Saved Replies in Supabase with create/edit/delete/use.
- Saved Reply images: max 3, private Supabase Storage bucket, attachment metadata in DB.
- Selecting Saved Reply fills composer first; it never auto-sends. Images can be removed before send.
- Existing 7-line auto-growing composer behavior retained.

DATABASE / STORAGE
Run this migration once on the same Supabase project used by Melo Chat Lite:
  supabase/migrations/20261001143000_support_inbox_realtime_saved_replies.sql

Option A — Supabase Dashboard:
1. Open Supabase > SQL Editor.
2. Paste the complete migration SQL above.
3. Run it once.

Option B — Supabase CLI (if this project is linked):
  cd D:\project\melochat-web-lite
  npx supabase db push

AFTER COPYING THIS OVERLAY
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run dev

TYPECHECK PERFORMED BEFORE DELIVERY
  npx tsc --noEmit
  Result: PASS (exit code 0, no TypeScript errors)

NOTES
- No Service Role Key is used in client code.
- ChatDrawer.tsx was not modified.
- Direct Chat / Match Chat / Translation / Pagination logic was not modified by this overlay.
