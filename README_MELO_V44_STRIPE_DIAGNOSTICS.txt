Melo Chat Lite V44 - Stripe Live Checkout diagnostics

Changes:
- Adds explicit diagnostic codes to every early failure branch in /api/stripe/create-checkout.
- Preserves live/sandbox separation. No fallback is added.
- Adds upstream HTTP status for Supabase auth/offer lookup failures (safe metadata only).
- Package UI now shows the safe API error text plus diagnostic code instead of collapsing to CHECKOUT_ERROR.
- Does not change Translation Add-ons, Boost Add-ons, webhook fulfillment, or entitlements.

Run after overlay:
  npx tsc --noEmit
  npm run build

No SQL.
No new environment variables.
