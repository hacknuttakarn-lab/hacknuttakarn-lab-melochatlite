Melo Chat Lite V55 — Verified chat badge/warning + Admin package/add-on assignment

Changes:
1) Direct chat shows a Verified badge after the verified user's displayed name/title.
2) Unverified direct chats show a safety notice at the top of the conversation.
3) Admin Center > Users > Package popup now includes Plans, Translation Add-ons, and Boost Add-ons.
4) Translation Add-ons keep current Premium/Premium+ eligibility rules.
5) Boost Add-ons can be granted by Admin via new RPC admin_center_assign_boost_addon_v55.

Required SQL:
supabase/migrations/20261014212000_admin_boost_addon_assign_v55.sql

Run after overlay + SQL:
npx tsc --noEmit
npm run build
npx vercel --prod
