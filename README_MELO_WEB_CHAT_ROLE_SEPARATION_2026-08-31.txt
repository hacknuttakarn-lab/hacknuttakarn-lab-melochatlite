MELO WEB CHAT ROLE SEPARATION + DATA PARITY AUDIT
Date: 2026-08-31

PURPOSE
-------
1) Fix the Web chat-side ownership logic so User and Partner/Business do not
   interpret the same message as the same side.
2) Use active Business identity for Partner chat, instead of relying on auth.uid()
   alone.
3) Normalize "[Melo member](.../users/<id>)" contact text when the existing
   message row already contains a real profile/contact display name.
4) Audit every Web source/page for Supabase data access and compare table/RPC/
   Edge Function/Storage names against the Android project.

FILES
-----
MELO_APPLY_WEB_CHAT_ROLE_SEPARATION_2026-08-31.cjs
MELO_AUDIT_WEB_ANDROID_DATA_PARITY_2026-08-31.cjs
MELO_RUN_WEB_CHAT_FIX_AND_AUDIT_2026-08-31.cmd

The apply script creates this helper inside the Web project:
components/chat/chatIdentity.ts

It only edits these existing chat files when a safe target pattern is detected:
components/chat/ChatConversationPane.tsx
components/chat/chatData.ts
components/chat/ChatCenter.tsx
components/chat/ChatDrawer.tsx

A changed file receives a one-time local backup:
<file>.melo-before-chat-role-fix

HOW TO USE
----------
1. Extract this ZIP.
2. Copy the three root files into the ROOT of your Melochat Web project.
3. Open Terminal/PowerShell in the Web project root.

Apply the chat fix:
node MELO_APPLY_WEB_CHAT_ROLE_SEPARATION_2026-08-31.cjs

Run the detailed Web <-> Android data audit:
node MELO_AUDIT_WEB_ANDROID_DATA_PARITY_2026-08-31.cjs "D:\project\melochat-main"

Or run both:
MELO_RUN_WEB_CHAT_FIX_AND_AUDIT_2026-08-31.cmd "D:\project\melochat-main"

Then verify build:
npm run build

For development:
npm run dev

NO SQL is required by this overlay.
NO npm package install is required.

IMPORTANT SAFETY BEHAVIOR
-------------------------
The patcher is conservative. If it cannot safely identify both the current User
identity expression and the active Business identity expression in the current
chat source, it DOES NOT guess an ownership patch. It reports SAFE STOP instead.

This is intentional so unrelated Melochat Web logic is not damaged.

AUDIT OUTPUT
------------
MELO_WEB_ANDROID_DATA_PARITY_REPORT_2026-08-31.md

The audit:
- scans all Web pages/source files
- scans Android TypeScript/JavaScript/SQL source
- inventories Supabase .from(table)
- inventories Supabase .rpc(function)
- inventories Edge Function invocation
- inventories Storage buckets
- lists Web-only vs Android-only references
- flags chat sender logic without detected Partner/Business identity
- flags "Melo member" fallback in chat
- flags Nominatim/Photon location sources when Android ai-trip-place-search is not used

LIGHT / DARK / LANGUAGES
------------------------
This overlay does not alter colors, CSS, layout, labels, or translation resources.
Therefore existing Light/Dark and 6-language behavior is preserved.
