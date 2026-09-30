Melo Chat Lite - Interested action Home/Profile fix v2

วางไฟล์ทั้งหมดใน ZIP ทับที่ root ของโปรเจกต์เดิม

แก้เฉพาะ:
- components/connect/connectData.ts
- lib/supabase/browser.ts

สาเหตุ:
profile_likes ใช้ RLS ที่อนุญาต INSERT/DELETE ของเจ้าของข้อมูล แต่ helper เดิมใช้ UPSERT (Prefer: resolution=merge-duplicates) ซึ่งมีโอกาสเข้า UPDATE path และถูก RLS ปฏิเสธ

การแก้:
- เพิ่ม restInsert แบบ INSERT จริง (return=minimal)
- setLoveLike fallback ใช้ DELETE + INSERT จริง แทน UPSERT
- ไม่แก้ UI/Layout/ภาษา/Theme/Responsive

ตรวจแล้ว: npx tsc --noEmit ผ่าน

หลังวางทับ หาก npm run dev เปิดอยู่ ให้หยุดและรันใหม่เพื่อเคลียร์ compiled module/cache
