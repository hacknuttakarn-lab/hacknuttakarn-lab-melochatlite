Melo Chat Lite V62 — Lifestyle persistence/canonicalization fix

What changed
- Settings and Onboarding now store Lifestyle in language-neutral canonical values.
- Legacy lifestyle_preferences.pet and lifestyle_preferences.pets are merged into pets.
- Existing Thai/English/German values are normalized without deleting the user's choices.
- Switching TH / EN / DE no longer makes saved Lifestyle selections appear empty.
- Public profile display and Connect data support the canonical pets key.

Canonical examples
pets: ["cat", "fish"]
drink: ["never"]
smoke: ["never"]
exercise: ["rarely"]
social: ["introvert"]
interests: ["travel", "pets", "foodie"]

Required SQL
Run supabase/migrations/20261015165000_lifestyle_canonical_values_v62.sql once in Supabase SQL Editor before/with deploy.

Validation
1) Run SQL migration.
2) Open Settings and confirm previous Lifestyle choices are selected.
3) Switch TH -> EN -> DE; selections must remain selected while labels change.
4) Change a Lifestyle value, Save, reload; selection must persist.
5) New onboarding users must save canonical values under lifestyle_preferences.pets (not pet).

Commands
npx tsc --noEmit
npm run build
npx vercel --prod
