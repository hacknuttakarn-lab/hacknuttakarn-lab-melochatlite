Melo Chat Lite V57

Changes
1) Chat after package expiry
- Premium/Premium+ members who already matched can continue direct chat after the paid package expires.
- Free/expired members cannot start a new direct chat with an unrelated user.
- Existing paid restrictions for profile viewing, Interested, comments, etc. are unchanged.

2) My Plan / Usage
- Main package dates and Translation Add-on dates are shown separately.
- Active Translation Add-ons show purchase date, valid-until date, and character usage.

3) Login persistence audit
- No idle/inactivity auto logout was found.
- Session is stored in localStorage and refreshes using the Supabase refresh token.
- Session is cleared only by explicit logout or when Supabase explicitly rejects/revokes the refresh token.

Apply
1. Overlay files into the project.
2. Run SQL migration:
   supabase/migrations/20261003233000_chat_match_grandfather_v41.sql
3. Run:
   npm install
   npx tsc --noEmit
4. Redeploy Vercel.
