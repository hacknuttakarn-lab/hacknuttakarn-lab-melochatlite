MELO CHAT LITE V45 - TypeScript build fix

Fixed:
components/premium/PremiumPlanExperience.tsx

Change:
Explicitly typed the local checkout diagnostic message variable as string.
This fixes the TypeScript literal-union assignment error at the checkout error mapping logic.

No SQL changes.
No environment variable changes.

Run after overlay:
  npx tsc --noEmit
  npm run build
