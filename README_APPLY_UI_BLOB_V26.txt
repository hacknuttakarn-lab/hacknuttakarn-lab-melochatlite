Melo Chat Lite V26 — UI + Blob credential compatibility

Changes:
- Mobile landing phone preview centered.
- Mobile Boost Profile launcher sits behind the opened hamburger drawer, while remaining above bottom navigation.
- Create/Edit Post dialog moved slightly upward with more bottom safe-area room.
- Post ⋯ actions stay anchored beside the post menu button on mobile.
- Desktop Login wording updated for Melo Chat Lite web-only product.
- Desktop Login/Register header uses Language control instead of Download.
- Premium tabs reordered: Plans | Translation Add-ons | My Plan / Usage.
- Vercel Blob route supports BLOB_READ_WRITE_TOKEN or VERCEL_OIDC_TOKEN + BLOB_STORE_ID.

No SQL migration in V26.

After overlay:
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run build
  npm run dev

Blob local notes:
- Vercel production/preview can use connected Blob credentials.
- For local Blob upload, prefer `npx vercel dev` so VERCEL_OIDC_TOKEN is available.
- If running plain `npm run dev` without Blob credentials, Blob uploads cannot authenticate.

Verify documents:
- Keep the existing private Supabase Storage. No migration is required.
- Do NOT move existing verification documents into the public `melochat-images` Blob store.
