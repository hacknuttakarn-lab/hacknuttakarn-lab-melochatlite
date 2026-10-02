Melo Chat Lite — V30 Dynamic Package Offers

What changed
- Admin > Packages: package duration/price is now stored as a package offer instead of fixed 1/3/6 price fields in the editor.
- New package editor uses Duration + Price.
- Duration options: Free, 1 month, 3 months, 6 months, 1 year.
- Package duration tabs are generated automatically from offers stored in Supabase.
- Promotion fields: enable promotion, promotion price, label, start and end.
- Admin user package assignment now selects a real saved duration/offer and records the effective amount (including active promotion).
- Existing 1/3/6 legacy price columns are kept in sync for compatibility with the current User Premium page.

SQL migration
supabase/migrations/20261002093000_dynamic_package_offers_v30.sql

Apply
1) Overlay this ZIP on the current project.
2) Run:
   cd D:\project\melochat-web-lite
   npx supabase db push
   npx tsc --noEmit
   npm run build
   npm run dev

Notes
- The migration backfills current Free/Premium/Premium+ offers from the existing 1/3/6-month prices.
- A 12-month offer automatically creates a 1-year tab in Admin > Packages.
- Free uses duration_months=0 and price 0.
- Promotion price is used only while the promotion is enabled and within its optional start/end window.
