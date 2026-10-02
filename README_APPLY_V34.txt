Melo Chat Lite V34

Changes
1) Admin Center package cancellation now revokes the matching active user subscription too.
2) Existing cancelled admin package transactions are repaired if their matching subscription was left active by the old logic.
3) User menu label /premium is renamed:
   TH: แพ็กเกต
   EN: Packages
   DE: Pakete

Apply
cd D:\project\melochat-web-lite
npx supabase db push
npx tsc --noEmit
npm run build
npm run dev

Expected result
- Cancel an active package sale in Admin Center > Package reports.
- User no longer retains that paid package after refresh/reload.
- With no other active subscription, the user falls back to Free.
