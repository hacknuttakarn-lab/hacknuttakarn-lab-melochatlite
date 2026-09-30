Melo Chat Lite - Admin Center V1

1) Copy this overlay over the project root.
2) Run the SQL migration in Supabase SQL Editor:
   supabase/migrations/20260930152000_admin_center_v1.sql
3) Then run:
   npx tsc --noEmit
   npm run dev

Admin menu:
- Header dropdown: Admin Center -> /admin
- Existing document approval workflow is preserved at /admin/review-center and linked from Admin Center.

V1 modules:
- User management + detail popup + view profile + suspend + +30-day renewal + delete
- User reports data foundation
- Package transactions/revenue summary
- Package CRUD
- Premium page reads active package definitions from subscription_plans

Important:
- Delete is destructive: it deletes the Auth user. Related rows with ON DELETE CASCADE may also be removed according to existing DB relationships. The UI asks for confirmation.
- Suspend status is persisted in user_admin_status. To enforce suspension at login/request level across the whole app, a later auth/session guard can consume this status globally.
- Purchase checkout/payment gateway is not added in V1. package_transactions is ready to receive purchase/renewal records when payment is connected.
