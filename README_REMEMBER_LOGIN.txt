Melochat Lite — Remember Login / Auto Redirect
วันที่: 02/10/2026

แก้ไขเฉพาะ:
- หากผู้ใช้เคยล็อกอินและ session ยังใช้งานได้ ระบบจะจำการเข้าสู่ระบบผ่าน session ที่เก็บใน browser เดิม
- เมื่อปิดเว็บแล้วกลับเข้ามาใหม่ใน browser/device เดิม ไม่ต้องล็อกอินใหม่ตราบใดที่ session/refresh token ยังใช้งานได้
- หากเปิดลิงก์ /login ขณะที่ยังล็อกอินอยู่ ระบบจะตรวจ session และพาเข้า /account อัตโนมัติ
- หาก onboarding ยังไม่เสร็จ จะพาไป /onboarding แทน
- ผู้ใช้จะต้องล็อกอินใหม่เมื่อกด Logout, ล้างข้อมูลเว็บไซต์/browser, ใช้ Private/Incognito, หรือ session ถูก Supabase ยกเลิก/หมดอายุแบบไม่สามารถ refresh ได้

ไฟล์ที่แก้:
- app/login/page.tsx

SQL:
- ไม่มี SQL ที่ต้องรัน

คำสั่งหลังวางทับ:
npx tsc --noEmit

ผลตรวจ:
- TypeScript ผ่าน (node ./node_modules/typescript/bin/tsc --noEmit)
