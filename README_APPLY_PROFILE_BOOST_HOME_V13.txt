Melo Chat Lite — Profile Boost Home V13
======================================

ฐานที่ใช้ทำงาน:
- melochat-web-lite(8).zip
- Overlay V2 ถึง V12 ตามลำดับล่าสุดของงานในแชท

สิ่งที่เพิ่ม
1) หน้า Home มีปุ่ม Boost Profile ด้านขวาบน
2) กดแล้วเปิด Popup การ์ด Profile ของตัวเอง โดยใช้หน้าตาการ์ดเดียวกับ Home
3) ด้านล่างการ์ดมีปุ่ม Boost Profile ปุ่มเดียว
4) Boost จะอัปเดต profiles.profile_boosted_at
5) Home ranking ใช้เวลาที่ใหม่กว่าระหว่าง created_at กับ profile_boosted_at
   - สมาชิกใหม่จึงยังถูกแนะนำต้น ๆ
   - สมาชิกเก่าที่ Boost จะกลับขึ้นมาใหม่
6) เก็บ profile_boost_events สำหรับต่อยอดโควตาแพ็กเกจภายหลัง
7) รอบนี้ยังไม่จำกัดจำนวน Boost
8) รองรับ Dark/Light, TH/EN/DE, Desktop/Tablet/Mobile และ Mobile Safe Area

ไฟล์ที่แก้
- components/home/HomeDashboardExperience.tsx
- components/home/HomeDashboardExperience.module.css
- components/connect/connectData.ts

ไฟล์ที่เพิ่ม
- supabase/migrations/20261001203000_profile_boost_home_v13.sql

ต้องรัน Migration
-----------------
วิธี Supabase CLI:
  cd D:\project\melochat-web-lite
  npx supabase db push

หรือเปิด Supabase SQL Editor แล้วรันไฟล์:
  supabase/migrations/20261001203000_profile_boost_home_v13.sql

จากนั้นตรวจ:
  cd D:\project\melochat-web-lite
  npx tsc --noEmit
  npm run dev

ผลการตรวจในชุดงานนี้:
- npx tsc --noEmit : PASS (Exit Code 0)
