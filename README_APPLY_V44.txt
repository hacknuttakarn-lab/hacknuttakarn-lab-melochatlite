MELO CHAT LITE V44 OVERLAY

Fixes:
1. Prevents empty-string img src errors on Profile (cover/avatar/composer/post author).
2. Adds Gender after First name / Last name in onboarding Personal details.
3. Adds Gender to Settings > Personal profile.
4. Supports TH / EN / DE labels and dark/light using existing components/styles.

Apply:
- Extract this ZIP over the project root.
- Run Supabase migration: supabase/migrations/20260928210000_profile_gender.sql
- Restart dev server: npm run dev
