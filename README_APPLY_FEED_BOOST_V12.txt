Melo Chat Lite - Feed Boost V12

Fixes
- Feed final merge now sorts by boostedAt || createdAt, not createdAt alone.
- Feed listens for melo-feed-updated so a profile boost can refresh an already-open Feed.
- No new SQL migration is required for V12.

Important
- V12 assumes the earlier boost foundation/migration that adds social_posts.boosted_at and boost_social_post() has already been applied (V8/V9/V11 series).
- If V11 SQL was not run yet, run the existing 20261001193000_feed_boost_order_v11.sql first.

Validation
- Full repository tsc still finds pre-existing errors inside historical backup/old overlay source folders.
- Active application source was checked with those historical folders excluded:
  npx tsc --noEmit -p tsconfig.active.json
  Result: PASS / exit code 0.
- The V12 change itself introduces no TypeScript errors.

Normal local test
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Test
1. Open own Profile.
2. Boost an older post, e.g. "ทอบสอบโพสต์ 5".
3. Open /feed or keep Feed open in another tab.
4. That boosted post should appear before "ทอบสอบโพสต์ 10" in All feed.
