Melo Chat Lite - Feed Boost V11

WHAT THIS FIXES
1) A boosted post must return to the top of Feed, not only Profile.
2) V10 could only re-sort posts that the legacy feed RPC had already returned. If the boosted post was not in that page, browser sorting could not promote it.
3) V11 adds get_social_feed_boosted_v11(), which orders by COALESCE(boosted_at, created_at) BEFORE LIMIT/OFFSET in PostgreSQL.
4) The existing get_social_feed() is also refreshed to use the same boost-aware ordering for compatibility with older clients.

FILES
- components/feed/socialFeedWebData.ts
- supabase/migrations/20261001193000_feed_boost_order_v11.sql
- backups/20261001_feed_boost_v11/components/feed/socialFeedWebData.ts

REQUIRED SQL
Run the new migration before testing Feed:
  npx supabase db push

Or paste/run:
  supabase/migrations/20261001193000_feed_boost_order_v11.sql
in Supabase SQL Editor.

TEST
1) Open Profile and boost an older post (example: post 5).
2) Open Feed / refresh Feed.
3) The boosted post must be the first eligible Feed post.
4) Its original created date remains unchanged; boost only changes ordering via boosted_at.

GOOGLE SIGN-IN CONFIG NOTE
In Supabase Authentication > Sign In / Providers > Google:
- Enable Sign in with Google: ON
- Client IDs: must be the actual Google OAuth Web Client ID, e.g. 123...xyz.apps.googleusercontent.com
  Do NOT put an application name such as "Melo Chat Lite" in this field.
- Client Secret: paste the OAuth Web Client Secret from Google Auth Platform.
- Copy the Supabase Callback URL shown on this page and add it to Google Auth Platform > Web application > Authorized redirect URIs.
- Add http://localhost:3000 as an Authorized JavaScript origin for local testing.
- In Supabase Authentication > URL Configuration, allow http://localhost:3000/** for local redirects.

TYPESCRIPT CHECK
Active source check executed:
  npx tsc --noEmit
Result: PASS (exit code 0).
Legacy backup/old overlay directories were temporarily moved out of TypeScript scanning, then restored. They contain incomplete historical source copies and are not active application source.
