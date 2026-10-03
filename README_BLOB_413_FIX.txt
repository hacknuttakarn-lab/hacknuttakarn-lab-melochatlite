Melo Chat Lite - Vercel Blob 413 Fix

Cause:
The previous image upload flow sent the complete image to /api/blob/image first, then the Vercel Function uploaded it to Blob. Vercel Functions reject request bodies larger than about 4.5 MB before the route can process them, which caused "Blob upload failed (413)" even though the app-side limit was 12 MB.

Fix:
- Browser uploads image bytes directly to Vercel Blob using @vercel/blob/client upload().
- /api/blob/image now only performs the small secure token exchange with handleUpload().
- Supabase access token is validated server-side before an upload token is issued.
- Bucket/path ownership is still enforced.
- Existing 12 MB image limit remains.
- Existing DELETE flow remains intact.
- No database schema changes.

Files:
app/api/blob/image/route.ts
lib/blob/client.ts

After overlay:
npm install
npx tsc --noEmit

Then redeploy Vercel and test:
1. Profile photo
2. Profile gallery
3. Post image

Required existing env:
NEXT_PUBLIC_MELO_IMAGE_STORAGE=vercel_blob
BLOB_READ_WRITE_TOKEN (or Vercel Blob project connection/OIDC supported by the installed SDK/environment)
