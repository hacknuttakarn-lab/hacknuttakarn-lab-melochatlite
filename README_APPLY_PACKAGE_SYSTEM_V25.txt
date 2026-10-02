Melo Chat Lite — Package / Usage / Translation / Boost V25
==========================================================

Source of truth implemented in this overlay:
- Free / Premium / Premium+
- 1 / 3 / 6 month prepaid pricing
- Billing-month reset based on the member's subscription start date
- Profile post quota
- Translation character quota + Translation Add-ons
- Separate Profile Boost / Post Boost quotas
- Admin package management + member usage view/adjustments
- Backend entitlement checks for Interested / Match / Follow / Comment / Save / Chat / Translation / Boost
- Premium+ priority support + higher boost weight

IMPORTANT
---------
This overlay extends the existing subscription_plans / user_subscriptions system.
It does NOT create a second, parallel subscription system.

DEFAULT PLAN VALUES
-------------------
Free
- THB 0
- Profile posts: 3 / Billing Month
- Translation: 0
- Profile Boost: 0
- Post Boost: 0
- Cannot view full profiles / Interested / Follow / Match / Chat / Comment / Save / Translation
- Can Like Feed posts

Premium
- 1 month: THB 399
- 3 months: THB 1,099
- 6 months: THB 1,999
- Profile posts: 30 / Billing Month
- Translation: 30,000 chars / Billing Month
- Profile Boost: 4 / Billing Month
- Post Boost: 4 / Billing Month

Premium+
- 1 month: THB 699
- 3 months: THB 1,899
- 6 months: THB 3,499
- Profile posts: High Limit / Fair Use
- Translation: 100,000 chars / Billing Month
- Profile Boost: 10 / Billing Month
- Post Boost: 10 / Billing Month
- Priority Support
- Higher boost ranking weight than Premium

Translation Add-ons
- Translate Mini: THB 129 / +50,000 chars
- Translate Plus: THB 299 / +150,000 chars
- Translate Max: THB 549 / +300,000 chars
- Eligible: Premium / Premium+
- Add-on quota is tied to the current Billing Month and does not roll over
- Base plan translation quota is consumed before add-on quota

FILES CHANGED / ADDED
---------------------
app/premium/page.tsx
app/api/translate/route.ts
components/premium/PremiumPlanExperience.tsx
components/premium/PremiumPlanExperience.module.css
components/admin/AdminCenter.tsx
components/chat/ChatConversationPane.tsx
components/chat/chatData.ts
components/support/AdminSupportChat.tsx
components/lite/LiteMockExperience.tsx
components/home/HomeDashboardExperience.tsx
components/connect/connectData.ts
lib/plan/planWeb.ts
supabase/migrations/20261002003000_package_entitlements_usage_v25.sql

APPLY
-----
1) Extract this ZIP over the project root.

2) Apply the Supabase migration:

   cd D:\project\melochat-web-lite
   npx supabase db push

   Or run this file manually in Supabase SQL Editor:
   supabase/migrations/20261002003000_package_entitlements_usage_v25.sql

3) Check TypeScript:

   npx tsc --noEmit

4) Build / run:

   npm run build
   npm run dev

NOTES
-----
- The current purchase button continues the existing Support Chat purchase flow; no payment gateway is introduced by this overlay.
- Admin package assignment supports 1 / 3 / 6 month terms.
- Admin > Packages can edit plan prices, quotas, entitlements and Translation Add-ons.
- User > Premium now includes Plans / My Plan & Usage / Translation Add-ons.
- Admin user details include Usage, with reset/add-quota adjustments recorded in Audit Log.
- The translation API now requires the logged-in bearer token, checks plan/usage, reuses cached translations, counts actual translated characters, and does not charge same-language messages that the chat client can identify before calling the API.
- Existing Supabase Realtime, Support Chat, notifications, Feed/Profile social logic, and Blob image storage are not replaced.
- Profile/Post Boost are separate quotas. Ranking uses a boost score/priority rather than a hard-coded fixed Rank #1. Premium+ receives a larger default boost priority than Premium.

VALIDATION PERFORMED
--------------------
- npx tsc --noEmit: PASS in the reconstructed active source used to create this overlay.
- npm run build could not be completed in the artifact environment because the existing Next executable from the imported Windows project was not executable on Linux ("next: Permission denied"). Run npm run build on the project machine after applying the overlay.
