Melo Chat Lite — Mobile Navigation/Admin V17

Changes
1) Mobile bottom navigation content is lifted upward with more bottom breathing room / safe-area space.
2) Mobile Feed hides Likes You and Matches side cards. Desktop/tablet behavior remains unchanged.
3) In Admin Center mobile hamburger menu, the primary menu becomes:
   - Document approval
   - All users
   - User reports
   - Package reports
   - System packages
   - Admin permissions
   - Audit log
   Back to User Area / Language / Theme remain unchanged.
4) AdminCenter now reacts to /admin?tab=... query changes while already mounted.

SQL / Supabase migration
- None.

Commands
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Validation in build workspace
- Full `tsc --noEmit` was invoked against the reconstructed active project, but the container run exceeded its 120-second execution window before returning a result.
- No TypeScript diagnostic was returned before timeout.
- Syntax transpile check passed for the TypeScript files changed in V17:
  components/Header.tsx
  components/admin/AdminCenter.tsx

Please run `npx tsc --noEmit` locally after overlaying, as required by the project workflow.
