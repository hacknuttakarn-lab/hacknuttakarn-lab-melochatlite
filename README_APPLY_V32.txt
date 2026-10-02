Melo Chat Lite V32

Changes:
- Profile composer copy: TH/EN/DE introduction-focused wording.
- Deduplicate Relationship sought values across TH/EN/DE synonyms.
- Admin/Super Admin normal User Area translation quota = Premium+ 100,000 chars/Billing Month.
- Admin Center Support Chat translation remains unlimited and does not consume package quota.
- Admin/Super Admin Profile Boost = 10/Billing Month and Post Boost = 10/Billing Month (Premium+ limits).
- Other Admin/Super Admin feature access remains enabled; profile posts remain High Limit / Fair Use.
- Premium usage card explains Support Chat translation is unlimited/not counted.

Run:
cd D:\project\melochat-web-lite
npx supabase db push
npx tsc --noEmit
npm run build
npm run dev
