Melo Chat Lite - User Reports + Warning/Notification Flow

Changed:
- Admin Center > User reports now shows reported member ID, email, report reason/details/status.
- Report actions: View profile, Warning, Suspend/Reactivate, Delete.
- Report detail popup with internal admin note, Resolve and Dismiss.
- Warning popup: Notice / Warning / Action required, editable subject dropdown and editable message template.
- Reporter identity is not exposed to the reported member.
- Member warnings appear in the existing Notification Center and open a detail popup.
- Acknowledge/read state is stored.
- Existing Admin Center pagination remains 10 items per page.
- Admin actions are written to Audit log.

IMPORTANT - Supabase:
Run this SQL migration in Supabase SQL Editor before testing:
supabase/migrations/20260930190000_user_report_warning_flow.sql

Then locally:
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

Validation performed on the supplied full project:
npx tsc --noEmit -> PASS
