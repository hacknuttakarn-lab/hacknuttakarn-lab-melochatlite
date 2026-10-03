Melo Chat Lite — Stripe fulfillment V55

1) Apply SQL in Supabase SQL Editor:
   supabase/migrations/20261003221500_stripe_checkout_fulfillment_v39.sql

2) Add Vercel Production Secret:
   SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
   Never expose this as NEXT_PUBLIC_*.

3) Overlay the ZIP onto the current project.

4) Run:
   npm install
   npx tsc --noEmit

5) Redeploy Production.

6) Sandbox test:
   - STRIPE_CHECKOUT_MODE=sandbox
   - buy Premium with Stripe test card 4242 4242 4242 4242
   - Stripe webhook must return HTTP 200
   - Premium > My Plan / Usage should show the purchased plan after refresh

Notes:
- Webhook fulfillment is idempotent by Stripe event/session id.
- Client success URL never activates the package.
- Existing Webhook signature verification remains in place.
