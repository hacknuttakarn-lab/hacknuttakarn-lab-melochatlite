MELO WEB DIRECT CHAT RUNTIME FIX
Date: 2026-08-31

Problem
-------
Runtime ReferenceError:
businessId is not defined

File:
components/chat/ChatConversationPane.tsx
directMine()

Cause
-----
The previous chat patch incorrectly injected Business identity logic into
directMine(), which is the Direct/User-to-User chat ownership check.

Fix
---
Restores Direct Chat ownership to:
message.senderId === currentUserId

This patch changes ONLY:
components/chat/ChatConversationPane.tsx

It does NOT change:
- database/schema
- Partner/Business data
- CSS/layout
- Light/Dark Mode
- translations/language resources
- other pages

HOW TO USE
----------
1. Extract this ZIP.
2. Copy MELO_APPLY_DIRECT_CHAT_RUNTIME_FIX_2026-08-31.cjs into:
   D:\project\melochat-web\
3. Open PowerShell in D:\project\melochat-web
4. Run:

node MELO_APPLY_DIRECT_CHAT_RUNTIME_FIX_2026-08-31.cjs

5. Then:

npm run build

6. If build passes:

npm run dev

Do NOT run the old:
MELO_APPLY_WEB_CHAT_ROLE_SEPARATION_2026-08-31.cjs
again, because that old patcher is what inserted the invalid businessId reference.

No SQL required.
No npm install required.
