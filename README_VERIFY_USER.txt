Melo Chat Lite/Web — User Verify overlay

แก้เฉพาะ:
- components/Header.tsx : เพิ่มเมนู Verify ใน dropdown ฝั่ง user
- app/verify/page.tsx : route /verify
- components/verify/* : หน้า Verify รองรับ Light/Dark, Responsive mobile/desktop, TH/EN/DE
- supabase/migrations/20260927221500_user_identity_verification.sql : ตาราง/RLS/private bucket/RPC สำหรับ Supabase ใหม่

วิธีใช้:
1) แตก ZIP นี้ทับ root ของโปรเจกต์เดิม
2) เปิด Supabase SQL Editor ของโปรเจกต์ใหม่ แล้วรันไฟล์:
   supabase/migrations/20260927221500_user_identity_verification.sql
3) รัน npm run typecheck
4) รัน npm run dev แล้วทดสอบ /verify

หมายเหตุ:
- ต้องมี admin_users จากระบบ Admin ที่ทำไว้ก่อนหน้า เพื่อให้ Admin Review RPC อนุญาต admin/super_admin
- เอกสารถูกเก็บใน bucket verification-private แบบ private และ path ขึ้นต้นด้วย user_id
- ไม่ได้แก้ส่วนอื่นของโปรเจกต์นอกเหนือจากงาน Verify และ Header menu
