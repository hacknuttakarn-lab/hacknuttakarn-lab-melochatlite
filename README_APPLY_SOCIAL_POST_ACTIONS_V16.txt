Melo Chat Lite — Social Post Actions V16

Changes
1) Other-user profile posts now reuse the existing social-post actions:
   - Like / Unlike
   - Open comments drawer + comment
   - Save / Unsave
   Counts and states update immediately in the profile post list.

2) Feed posts owned by the signed-in user now show the same three-dot menu used on Profile:
   - Boost post
   - Edit post
   - Delete post
   Edit reuses SocialPostComposerModal. Boost reuses boostSocialPostWeb. Delete reuses deleteSocialPostWeb.

3) The profile post composer is shown only on the signed-in user's own profile. Other-user profiles remain read-only for creation, while interaction actions remain enabled.

Files changed
- components/lite/LiteMockExperience.tsx

Database / SQL
- No new SQL migration is required.
- Existing social post Like / Save / Comments / Edit / Delete / Boost functions and RLS are reused.

Verification performed
- npx tsc --noEmit --pretty false
- Result: PASS (exit code 0) against the active project source used for this overlay.

Run after copying overlay
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Suggested checks
A. Sign in as User A, open User B profile, then Like / Comment / Save a post.
B. Refresh User B profile and confirm persisted action state/counts.
C. On Feed, locate a post created by User A; confirm the ... menu appears.
D. Test Edit, Delete and Boost from Feed.
E. Confirm ... is NOT shown on another user's Feed post.
