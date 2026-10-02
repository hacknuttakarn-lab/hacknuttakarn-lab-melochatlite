Melochat Lite — Admin Center Mobile Left Menu Background Fix
วันที่: 02/10/2026

แก้ไขเฉพาะ:
- ทำให้แถบเมนูฝั่งซ้ายบนมือถือ (signed-in drawer) มีพื้นหลังยาวลงไปถึงขอบล่างจอ
- แก้ตามคำขอที่พบชัดเจนในโหมด Admin Center
- คงการแสดงผลของเมนูเดิม, การเลื่อนใน drawer, safe area, dark/light mode และ responsive เดิมไว้

ไฟล์ที่แก้:
- app/globals.css

SQL:
- ไม่มี SQL ที่ต้องรัน

คำสั่งที่ต้องรันหลังวางทับใน VS Code / PowerShell:
- npx tsc --noEmit

ผลตรวจใน sandbox:
- node ./node_modules/typescript/bin/tsc --noEmit  => ผ่าน
