Melo Chat Lite — Admin Support Mobile Conversation List V21

Changes:
- Mobile Admin Support opens on the conversation/user list first.
- Tapping a user opens that support conversation.
- Adds a mobile-only Back to conversations button in the conversation view.
- Desktop keeps the existing two-column inbox layout.
- Reuses current realtime, unread, translation, saved replies, attachments and composer behavior.

No SQL migration is required.

After overlay:
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run dev
