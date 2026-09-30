Melo Chat Lite/Web - Admin Review Center layout fix

แก้เฉพาะ layout ของ Admin Review Center:
- ไม่เปิด Verification Review เป็นหน้า standalone อีกต่อไป
- ใช้โครงหน้า Admin Review Center เดิม (MELO SETTINGS / Admin Review Center / Back to settings)
- แสดง verification list + detail panel ใต้หัวข้อหลักเดิม
- logic Verify, Approve/Reject, SQL และหน้าอื่นไม่เปลี่ยน

วิธีใช้:
1. แตก ZIP แล้ววางทับ project root
2. ไม่ต้องรัน SQL เพิ่มสำหรับงาน layout รอบนี้
3. npm run typecheck
4. npm run dev

TypeScript typecheck: passed
