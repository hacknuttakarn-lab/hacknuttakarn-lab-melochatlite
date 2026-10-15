Melo Chat Lite V61
- Translation Add-on credits no longer expire; they remain until fully used.
- Boost Add-ons are hidden from User Packages and Admin Center Packages/User assignment UI. Existing boost data is preserved.
- Free/expired users may continue chat when they still have an existing profile match; new matching remains controlled by normal plan rules.

Run SQL:
supabase/migrations/20261015153000_translation_no_expiry_hide_boost_free_matched_chat_v61.sql

Then:
npx tsc --noEmit
npm run build
npx vercel --prod
