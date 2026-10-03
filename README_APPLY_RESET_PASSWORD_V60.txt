Melo Chat Lite — V60 Reset Password UI

Changes:
- Reset password page is vertically centered more naturally on desktop/tablet.
- On mobile, the marketing/intro section is hidden for reset-password only.
- Mobile reset card is centered in the available viewport with safe-area padding.
- Both password fields have show/hide password controls.
- TH / EN / DE accessibility labels are included.
- No SQL required.

Files:
- app/reset-password/page.tsx
- components/auth/AuthFrame.tsx
- components/auth/AuthFrame.module.css

After overlay:
npx tsc --noEmit
