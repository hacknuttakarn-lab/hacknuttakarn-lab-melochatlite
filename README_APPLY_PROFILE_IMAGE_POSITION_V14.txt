Melo Chat Lite — Profile image positioning V14

Changes
- Profile avatar: selecting an image now opens an adjustment dialog before upload.
- Cover image: selecting an image now opens an adjustment dialog before upload.
- Adjustment supports horizontal position, vertical position and zoom.
- The adjusted/cropped image is generated client-side and then uploaded using the existing profile upload functions. No new storage system is introduced.
- Saved status (✓ Saved / ✓ บันทึกแล้ว / ✓ Gespeichert) automatically disappears after about 2 seconds.
- Error messages remain visible so users can read them.
- Dark/Light, TH/EN/DE, responsive mobile/tablet/desktop and mobile safe area styles are included.

Files changed
components/lite/LiteMockExperience.tsx
components/lite/LiteMockExperience.module.css

SQL
No SQL migration is required for V14.

Validation
A full `npx tsc --noEmit` was started against the merged project but exceeded the available execution window before returning a result.
A focused TypeScript check against the active Profile component and its imported dependencies was then run with:
  npx tsc --noEmit -p tsconfig.v14check.json --pretty false
Result: PASS (exit code 0).
The temporary tsconfig.v14check.json is NOT included in the overlay.

Commands after overlay
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev
