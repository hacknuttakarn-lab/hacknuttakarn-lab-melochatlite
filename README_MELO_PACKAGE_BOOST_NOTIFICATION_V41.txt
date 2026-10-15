Melo Chat Lite V41 — Stripe renewal, Boost Add-ons, Notification Read all

SQL (run first in Supabase SQL Editor):
  supabase/migrations/20261006183000_plan_renewal_boost_addons_v41.sql

Environment variables (no new variables):
  STRIPE_CHECKOUT_MODE=live|sandbox
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_SECRET_KEY_TEST=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_... (Live)
  STRIPE_WEBHOOK_SECRET_TEST=whsec_... (Sandbox)
  SUPABASE_SERVICE_ROLE_KEY=...
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
  NEXT_PUBLIC_SITE_URL=https://www.melochat.me

Commands:
  npm ci
  npx tsc --noEmit
  npm run build

Tests:
1) Live Plans Checkout: STRIPE_CHECKOUT_MODE=live, choose Premium/Premium+, confirm popup, verify Stripe Checkout opens.
2) Same plan: buy same plan and verify expires_at extends from prior expiry.
3) Different plan: buy another plan and verify new user_subscriptions row starts after the latest purchased package expiry; current entitlements remain until then.
4) Translation Add-on: Premium/Premium+ purchase still opens Checkout and webhook credits translation as before.
5) Profile/Post Boost: purchase each Boost Add-on; verify user_boost_addon_purchases receives 90-day credits and My Plan / Usage shows totals/used/remaining.
6) Boost consumption: monthly plan boost is used first; after monthly quota is exhausted, oldest unexpired add-on credit is used.
7) Notification: open one generic notification -> is_read=true and header badge decreases immediately.
8) Read all -> current user's notifications are marked read; support/system/admin notice sources are also reconciled; app badge is updated.

Live Stripe diagnostics:
  create-checkout now validates sk_live_/sk_test_ prefix and logs Stripe error type/code/message/requestId server-side without falling back environments.
  Client keeps a localized TH/EN/DE checkout failure message.
