Melochat Lite — Admin Center Mobile Drawer Bottom Gap Fix
วันที่: 02/10/2026

ตรวจพบ:
- พื้นที่สีเทาด้านล่างที่เห็นในภาพไม่ใช่เมนู/แถบอีกชุดที่มาบัง
- พื้นที่นั้นคือ backdrop ของเมนูมือถือที่โผล่ออกมา เพราะความสูง 100dvh บน mobile visual viewport บางกรณีสั้นกว่าพื้นที่ภาพ/หน้าจอจริง
- วงกลมตัว N ด้านล่างซ้ายเป็น Next.js development indicator และไม่ใช่ส่วนของเมนูจริง; production จะไม่ใช่แถบเมนูของ Melochat

แก้ไข:
- เพิ่ม class เฉพาะ Admin Center ให้ backdrop มือถือ
- ให้พื้นที่ใต้ความกว้างของ drawer ใช้พื้นหลัง var(--surface) ต่อเนื่องถึงขอบล่าง
- ไม่กระทบ User Area
- รองรับ Light/Dark ตาม var(--surface)
- ไม่แก้ระบบ/หน้าอื่น

ไฟล์ที่แก้:
- components/Header.tsx
- app/globals.css

SQL:
- ไม่มี SQL ที่ต้องรัน

คำสั่งหลังวางทับ:
npx tsc --noEmit

ผลตรวจใน sandbox:
- TypeScript check ผ่าน
