Melo Chat Lite V48 — iOS Form Zoom + Direct Chat Image Fix

แก้ไขเฉพาะ:
1) Mobile User: ป้องกัน iOS Safari/PWA ซูมหน้าอัตโนมัติเมื่อแตะช่องกรอกข้อความ
   - Left drawer search
   - Create/Edit Post
   - Profile About me / Edit profile
   - User Settings forms
2) Direct User Chat: แก้การส่ง/แสดงรูปภาพ
   - ใช้ private chat-media bucket
   - แสดงรูปผ่าน signed URL
   - เพิ่ม message_type/media_path ให้ chat_messages หากยังไม่มี

SQL ที่ต้องรัน:
supabase/migrations/20261003134500_ios_zoom_chat_media_v48.sql

แนะนำให้รัน SQL ผ่าน:
Supabase Dashboard -> SQL Editor -> New query -> วาง SQL -> Run

เนื่องจากโปรเจกต์นี้เคยพบ Local/Remote migration history ไม่ตรงกัน
ไม่แนะนำให้ใช้ npx supabase db push สำหรับไฟล์นี้

คำสั่งหลังวางทับ:
npx tsc --noEmit

ผลตรวจ:
TypeScript check ผ่าน ไม่มี error
