Melo Chat Lite - Settings Route V35 Overlay

Fix:
- /settings now renders the real SettingsExperience instead of LiteMockExperience kind="settings".
- Includes Personal Profile settings + Dating settings implementation from V34.
- Thai / English / German, Light / Dark, responsive behavior retained.
- Includes Supabase migration for personal profile settings and 6 gallery photos.

Apply:
1. Extract/copy this overlay into the Melo Chat Lite project root and overwrite matching files.
2. Run the SQL migration in Supabase SQL Editor:
   supabase/migrations/20260928160000_profile_personal_settings.sql
3. Restart dev server:
   npm run dev

Verification performed:
- TypeScript: ./node_modules/.bin/tsc --noEmit -> PASS
- next build could not complete in the isolated environment because Next attempted to download @next/swc from registry.npmjs.org and network access is unavailable.
