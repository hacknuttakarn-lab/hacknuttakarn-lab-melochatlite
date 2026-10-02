Melo Chat Lite V31 overlay

Changes
- Profile section title: Posts -> My Story / เรื่องราวของฉัน / Meine Story.
- User Support Chat translation is unlimited and OFF by default. User can turn it on per session.
- Admin/Super Admin Support Chat translation is unlimited.
- Admin/Super Admin get all product entitlements and unlimited Profile Posts / Profile Boost / Post Boost usage.
- Vercel Blob API explicitly supports either BLOB_READ_WRITE_TOKEN or VERCEL_OIDC_TOKEN + BLOB_STORE_ID.

Apply
1. Overlay this ZIP into the project root.
2. Run: npx supabase db push
3. Run: npx tsc --noEmit
4. Run: npm run build
5. Run: npm run dev (or npx vercel dev when testing OIDC Blob locally)

No Verify-document storage changes. Verify documents stay in private Supabase Storage.
