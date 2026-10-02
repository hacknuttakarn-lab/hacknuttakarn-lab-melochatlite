Melochat Lite — Left Menu Fix
วันที่: 02/10/2026

แก้ไขเฉพาะ:
- แถบเมนูฝั่งซ้ายบนมือถือใน User Area ที่เปิดแล้วเนื้อหาเมนูหาย
- แถบเมนูฝั่งซ้ายบนมือถือใน Admin Center ที่เปิดแล้วเนื้อหาเมนูหาย
- คงการเลื่อนภายใน Drawer และ Safe Area ด้านล่าง
- ไม่แก้ระบบอื่นที่ไม่เกี่ยวข้อง

ไฟล์ที่แก้:
- app/globals.css

SQL:
- ไม่มี SQL ที่ต้องรัน

หลังวางทับไฟล์ ให้รันใน VS Code / PowerShell ที่โฟลเดอร์โปรเจกต์:
npx tsc --noEmit

ผลการตรวจจากไฟล์ต้นฉบับที่ได้รับ:
- TypeScript check ผ่าน (ใช้ node ./node_modules/typescript/bin/tsc --noEmit ใน sandbox)

หมายเหตุ:
- รองรับ User Area / Admin Center
- Responsive: Desktop/Tablet เดิมไม่ถูกแตะ; patch ทำงานเฉพาะ max-width 760px
- รองรับ TH / EN / DE ตามเมนูเดิม
- รองรับ Light / Dark ผ่าน theme variables เดิม
