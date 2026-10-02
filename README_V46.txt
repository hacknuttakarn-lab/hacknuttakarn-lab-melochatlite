Melo Chat Lite V46 — Admin Mobile Logout + User Notification Sort

แก้ไขเฉพาะ:
1) Admin Center บนมือถือ: ปุ่ม Log out สามารถเลื่อนให้เห็นเต็มปุ่ม ไม่ถูกตัดครึ่งด้านล่าง
2) User Notifications/Activity: เรียงทุกประเภทตาม createdAt จากใหม่สุดไปเก่าสุด โดยไม่บังคับเอา System notification ขึ้นก่อน

ไฟล์ที่แก้:
- components/Header.tsx
- app/globals.css

รองรับ:
- Desktop / Mobile (CSS fix จำกัดเฉพาะ Admin Center mobile <= 760px)
- TH / EN / DE
- Light / Dark

SQL:
- ไม่มี SQL ที่ต้องรัน

คำสั่งหลังวางทับ:
npx tsc --noEmit

ผลตรวจ:
- TypeScript ผ่าน ไม่มี error
