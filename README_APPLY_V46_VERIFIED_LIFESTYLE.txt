Melo Chat Lite V46 - Verified Badge + Profile Lifestyle i18n

Changed files:
- components/VerifiedBadge.tsx
- lib/publicVerification.ts
- components/home/HomeDashboardExperience.tsx
- components/lite/LiteMockExperience.tsx

Changes:
1) Show blue Verified badge after user name/age on Home cards.
2) Show Verified badge in Feed post authors, Likes You / Matches / Following lists.
3) Show Verified badge on Connect cards.
4) Replace the plain profile verification check mark with the same Verified badge.
5) Profile Lifestyle values now follow app language (TH / EN / DE), including old aliases.
6) Mixed stored values are normalized and duplicate translated values are removed.
7) Relationship Lifestyle output excludes Interested-in gender values.

No SQL required.
No new environment variables required.

After overlay:
  npx tsc --noEmit
  npm run build

Then deploy production as usual.
