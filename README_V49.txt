Melo Chat Lite V49 — Mobile Settings / Admin Drawer / Direct Chat Image Fix

แก้ไขเฉพาะ:
1) Settings mobile:
   - Date of birth ไม่ล้นขอบขวา
   - Save profile ไม่ sticky ทับเนื้อหา และขยับลงจาก Lifestyle
2) Admin Center mobile left drawer:
   - ล็อกพื้นหลัง Admin ขณะเมนูเปิด
   - Drawer อยู่เหนือ content/backdrop
   - Drawer เลื่อนขึ้นลงเอง
   - Log out อยู่ใน flow ของ Drawer และเลื่อนลงมาเห็นเต็มปุ่ม
   - ตัด legacy painted-left backdrop ที่ทำให้ดูเหมือนพื้นหลังเลื่อนทับเมนู
3) Direct User Chat image:
   - Red error "Bucket not found" มาจาก Supabase Storage ไม่มี chat-media จริง
   - SQL V49 สร้าง/ซ่อม private bucket + policies + chat message media columns
   - SQL ท้ายไฟล์ SELECT ตรวจสอบ ต้องเห็น row id = chat-media

SQL ที่ต้องรัน:
supabase/migrations/20261003142000_chat_media_bucket_v49.sql

แนะนำ:
Supabase Dashboard -> SQL Editor -> New query -> วาง SQL ทั้งไฟล์ -> Run
เนื่องจาก Local/Remote migration history ของโปรเจกต์นี้เคยไม่ตรงกัน
ไม่แนะนำ npx supabase db push ในรอบนี้

คำสั่งหลังวาง ZIP:
npx tsc --noEmit

ผลตรวจใน sandbox:
TypeScript check ผ่าน ไม่มี error
