Melo Chat Lite — V43 Session / Chat / Push / Image Fix
วันที่: 02/10/2026

แก้ไขเฉพาะงานที่ร้องขอ:
1) Session / เปิดแท็บใหม่
- ใช้ session เดียวกันใน browser/origin เดียวกันผ่าน localStorage
- หน้า /login ตรวจ session เดิมและเข้า /account หรือ /onboarding อัตโนมัติ
- ถ้าอีกแท็บมีการ login/refresh session ขณะหน้า login เปิดอยู่ แท็บนั้นจะตรวจ session ใหม่โดยไม่ต้องกรอกรหัสซ้ำ

2) Mobile chat header + keyboard
- Direct/Match Chat: ผูก full-screen drawer กับ Visual Viewport ของมือถือ
- User Support Chat: header อยู่บนจอเมื่อ keyboard เปิด
- Admin Center Support Chat: ชื่อสมาชิก/หัวแชทไม่ถูก keyboard ดันออกนอกจอ
- รองรับ iOS Safari/Web App และ Android browser behavior ที่มี VisualViewport

3) Free package chat restriction
- Free เปิด Chat Drawer ไม่ได้: แสดงข้อความอัปเกรด Premium
- /chat route ถูกล็อกด้วยเช่นกัน
- ไม่โหลด body ของ direct messages ใน client สำหรับ Free
- SQL เพิ่ม restrictive SELECT policy ใน direct message tables ที่ใช้ RLS อยู่แล้ว
- Push direct message สำหรับ Free จะไม่แสดงข้อความที่อีกฝ่ายพิมพ์ แสดงเพียงว่ามีข้อความใหม่
- Support Chat ยังเปิดใช้งานได้ตามเดิม เพื่อให้สมาชิกติดต่อทีมงาน/ซื้อแพ็กเกจได้

4) Web Push ตอนเว็บไม่เปิด / หน้าจอล็อก
- Service Worker + Push subscription sync
- เมื่อ login/account session เปลี่ยน จะ sync push endpoint ให้ user ปัจจุบัน
- Edge Function send-web-push ส่ง notification จาก server แม้หน้าเว็บไม่ได้เปิด
- Direct message trigger สร้าง notification row แบบไม่เปิดเผย message body

5) แนบรูปใน Chat
- เพิ่ม private Supabase Storage bucket: chat-media
- จำกัด upload 12 MB และชนิดไฟล์ image
- เจ้าของ upload/update/delete ได้ใน folder ของตัวเอง
- authenticated user สามารถอ่านรูปผ่าน signed URL
- แก้ปัญหา "Bucket not found"

============================================================
A) วาง ZIP Overlay ทับโปรเจกต์
============================================================
จากนั้นใน VS Code / PowerShell ที่ project root:

npx tsc --noEmit

ผลตรวจใน ChatGPT sandbox: PASS / ไม่มี TypeScript error

============================================================
B) SQL — ต้องรัน
============================================================
ไฟล์:
supabase/migrations/20261002234500_chat_session_push_media_v43.sql

ถ้าใช้ Supabase CLI:

npx supabase db push

หรือเปิด Supabase Dashboard > SQL Editor แล้วรันไฟล์ SQL นี้

หมายเหตุ: ควรมี migration V22 (web push) และ V25 (package entitlements) อยู่แล้ว

============================================================
C) Web Push — ตั้งค่าครั้งเดียว (ถ้ายังไม่ได้ตั้ง)
============================================================
1. สร้าง VAPID keys:

npx web-push generate-vapid-keys

2. Vercel Environment Variables:

NEXT_PUBLIC_MELO_VAPID_PUBLIC_KEY=<PUBLIC_KEY>

และใส่ค่าเดียวกันใน .env.local ตอนพัฒนา local

3. Supabase Edge Function secrets:

npx supabase secrets set MELO_VAPID_PUBLIC_KEY="<PUBLIC_KEY>"
npx supabase secrets set MELO_VAPID_PRIVATE_KEY="<PRIVATE_KEY>"
npx supabase secrets set MELO_VAPID_SUBJECT="mailto:<YOUR_SUPPORT_EMAIL>"
npx supabase secrets set MELO_PUSH_WEBHOOK_SECRET="<LONG_RANDOM_SECRET>"

4. Deploy Edge Function:

npx supabase functions deploy send-web-push --no-verify-jwt

5. Supabase Dashboard > Database > Webhooks
สร้าง/ตรวจให้มี Webhook ดังนี้

Webhook: notifications
- Table: public.notifications
- Event: INSERT
- Method: POST
- URL: https://<PROJECT_REF>.supabase.co/functions/v1/send-web-push
- Header: x-melo-webhook-secret = <MELO_PUSH_WEBHOOK_SECRET>

ถ้าระบบเก่ายังใช้ app_notifications ให้มีอีก 1 Webhook ด้วย:
- Table: public.app_notifications
- Event: INSERT
- URL และ Header เดียวกัน

6. Deploy Vercel หลังตั้ง Environment Variable ใหม่

ถ้า GitHub เชื่อม Vercel แล้ว:
git add .
git commit -m "Fix persistent session chat push and image upload"
git push origin main

หรือ deploy โดยตรง:
npx vercel --prod

============================================================
D) ข้อจำกัดของ Web Push บนมือถือ
============================================================
Android Chrome / PWA:
- ผู้ใช้ต้อง Allow Notifications
- ระบบแจ้งเตือนได้ตอน browser/background/lock screen ตามการตั้งค่า OS

iPhone / iPad:
- ต้อง iOS/iPadOS 16.4+
- ต้อง Add to Home Screen และเปิด Melo Chat จากไอคอน Home Screen
- ต้อง Allow Notifications สำหรับ Melo Chat Web App
- Safari tab ปกติบน iPhone ไม่สามารถรับ Web Push ตอนปิดเว็บได้เหมือน installed Home Screen web app

ทุกระบบไม่สามารถ bypass การปิด Notification ของ OS, Focus/Do Not Disturb, Force Stop หรือ battery restrictions ได้

============================================================
E) Test checklist
============================================================
- Login User A > เปิด tab ใหม่ URL /login > ต้องเข้า User A โดยไม่ถามรหัส
- Free user > กด Chat > ต้องเห็นหน้าล็อก Premium และไม่เห็นข้อความ
- Paid user > Chat ได้ตามปกติ
- Mobile > เปิด keyboard ใน Direct Chat > ชื่อคู่สนทนายังอยู่ด้านบน
- User Support > เปิด keyboard > Melo Chat Support header ยังอยู่
- Admin Support > เปิด keyboard > ชื่อสมาชิกยังอยู่
- Chat image > แนบ JPG/PNG/WebP > ไม่ขึ้น Bucket not found
- Allow Notification > ปิดเว็บ/ล็อกจอ > ส่ง notification/support/direct message > Push ต้องมาจาก OS
- Free receiver > direct-message Push ต้องไม่แสดงเนื้อหาที่ sender พิมพ์
