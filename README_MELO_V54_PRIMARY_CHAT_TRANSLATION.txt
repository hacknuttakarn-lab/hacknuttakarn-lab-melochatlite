Melo Chat Lite V54 - Primary Chat Language Translation Fix

Scope
- Direct chat auto-translation now uses the signed-in user's profiles.primary_language as the target language.
- Translation no longer skips a message because stored source_language, website UI language, nationality, or country appears to match the target.
- The actual source language is detected from the message text by Google Translate.
- New outgoing chat metadata uses primary chat language instead of website UI locale.
- /chat translation toggle now syncs with profiles.auto_translation_enabled and persists changes back to Settings.

Example
Primary chat language: English (en)
Incoming message text: Thai
Auto translation: On
=> Translate Thai -> English, regardless of either user's nationality/country/app UI language.

Changed files
- components/chat/ChatConversationPane.tsx
- components/chat/ChatCenter.tsx

SQL: none
Environment variables: none

Run after overlay
npx tsc --noEmit
npm run build
