MELO WEB - CHAT DATE SEPARATOR + TIME IN BUBBLE + ACTIVITY USER AVATAR
Date: 2026-09-02

Changed:
- components/chat/ChatConversationPane.tsx
- components/chat/ChatMessageAvatar.module.css

Chat layout:
1) Date is centered in the message timeline.
   - Shown for the first message of a day.
   - Shown again only when the calendar day changes.

2) Per-message timestamp:
   - Shows TIME ONLY.
   - Located inside the message bubble.
   - Placed at the bottom on its own line.

3) Trip / Event / Community chat:
   - Incoming messages now show the sender's Melo profile avatar.
   - Profile data is loaded by sender_id from public.profiles.
   - VerifiedUserAvatar is used, including verification badge when available.
   - Sender name/avatar link to /users/{sender_id}.
   - Own group messages remain on the right without an avatar.

4) Direct User/Partner chat:
   - Keeps the existing incoming avatar behavior.
   - User/Partner identity separation is untouched.

Preserved:
- Live-schema direct message sending
- User / Partner inbox separation
- Translation
- Images / location / stickers
- Announcements
- Realtime / notification / sounds

No SQL.
No npm install.
No chatData.ts changes.
