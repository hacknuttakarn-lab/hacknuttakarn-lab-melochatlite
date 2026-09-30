Melo Chat Lite - Admin Support Chat useEffect runtime fix

Fixed:
- AdminSupportChat useEffect now explicitly returns undefined instead of returning the result of scrollIntoView().
- Prevents React error: "useEffect must not return anything besides a function" / "destroy is not a function".

Changed file:
components/support/AdminSupportChat.tsx

No SQL/database changes.

After overlay:
  npx tsc --noEmit
  npm run dev
