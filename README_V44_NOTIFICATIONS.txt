Melo Chat Lite V44 — Create notifications table

สาเหตุ:
- ฐานข้อมูลปัจจุบันมี public.web_push_subscriptions แล้ว แต่ยังไม่มี public.notifications
- Database Webhook จึงไม่สามารถเลือก public.notifications ได้

วิธีใช้แบบ Dashboard:
1) Supabase -> SQL Editor -> New query
2) เปิดไฟล์ supabase/migrations/20261002235900_create_notifications_table_v44.sql
3) Copy ทั้งไฟล์ -> Paste -> Run
4) กลับ Integrations -> Database Webhooks -> Create webhook
5) Refresh หน้า แล้วเลือก Table: public.notifications
6) Event: INSERT

วิธีใช้แบบ VS Code / CLI:
npx supabase db push

หลังรัน SQL ไม่ต้อง Redeploy Vercel เพียงเพราะสร้าง table นี้
