Melo Chat Lite V56 — Stripe Translation Add-ons

Changes
- Translation Add-ons no longer redirect to Support Chat.
- Adds POST /api/stripe/create-addon-checkout.
- Browser sends addon_id only; price/name/quota are read from Supabase server-side.
- Server verifies the logged-in user and current-plan eligibility.
- Stripe metadata marks purchase_type=translation_addon.
- Existing Stripe webhook now fulfills either package purchases or translation add-ons.
- Add-on quota is applied only by the verified Stripe webhook and expires at the current billing-cycle end.
- Stripe retries are idempotent.

Apply
1. Overlay files onto the current project.
2. Run supabase/migrations/20261003225500_stripe_translation_addon_fulfillment_v40.sql in Supabase SQL Editor.
3. Existing env vars are reused; no new env var is required.
4. Run: npm install
5. Run: npx tsc --noEmit
6. Deploy Production.

Sandbox test
- Login with a Premium/Premium+ user.
- Package > Translation Add-ons > Buy add-on.
- Complete Stripe Sandbox checkout.
- Confirm webhook returns HTTP 200.
- Return to My Plan / Usage and confirm Translation total limit increased.
