Melo Chat Lite V51 — Mobile Home Boost + PWA App Badge

แก้ไขเฉพาะ:
1) Home มือถือ
   - ย้าย Boost Profile จากปุ่มใหญ่ด้านล่าง
   - ทำเป็นปุ่มไอคอน ⚡ ขนาดเล็ก
   - วางขวาสุดในแถวเดียวกับหัวข้อ “สำหรับคุณ / For you / Für dich”
   - Desktop/Tablet เดิมไม่ถูกเปลี่ยน

2) ตัวเลข Badge บนไอคอนแอป/PWA
   - รวมจำนวน Chats ที่ยังไม่อ่าน + Notifications ที่ยังไม่อ่าน
   - ตอนเปิดแอปจะ sync ตัวเลขกับจำนวนจริง
   - ตอนปิดแอป/อยู่แอปอื่น หากมี Web Push ใหม่ Service Worker จะเพิ่ม badge ต่อให้
   - เมื่อจำนวน unread กลับเป็น 0 จะล้าง badge

หมายเหตุ:
- iPhone/iPad ต้องติดตั้งเว็บด้วย Add to Home Screen และอนุญาต Notifications
- Badging API ขึ้นกับการรองรับของระบบปฏิบัติการ/Browser
- Android บาง Browser แสดง badge จาก unread notifications ตามระบบของเครื่อง

SQL:
- ไม่มี SQL ที่ต้องรัน

หลังวางทับ:
npx tsc --noEmit

ผลตรวจ:
- TypeScript ผ่าน
- Service Worker syntax ผ่าน
