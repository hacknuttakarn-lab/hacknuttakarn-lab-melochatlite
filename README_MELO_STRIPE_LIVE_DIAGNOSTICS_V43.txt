Melo Chat Lite V43 - Stripe Live Checkout Diagnostics

Changed files:
- app/api/stripe/create-checkout/route.ts
- components/premium/PremiumPlanExperience.tsx

What changed:
- The Plans checkout UI no longer discards the API error.
- Safe diagnostic code is shown in TH / EN / DE.
- Stripe session creation failures return safe fields: Stripe error type/code, request id, and checkout mode.
- No secret key or sensitive value is returned to the client.
- No sandbox/live fallback was added.

After overlay:
1) npx tsc --noEmit
2) npm run build
3) Deploy to Vercel
4) Try Plans > Choose plan once in Live mode and copy the diagnostic message shown on screen.

No SQL and no new environment variables are required for this overlay.
