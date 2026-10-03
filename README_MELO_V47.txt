Melo Chat Lite — V47 Mobile Menu + Push All Chat Fix

แก้เฉพาะงานรอบนี้:
1) User Support Chat (Mobile)
   - แก้พื้นที่ว่างด้านบนจาก iOS visualViewport.offsetTop ตอน keyboard ปิด
   - คง keyboard-safe header เดิมตอน keyboard เปิด

2) Admin Center Left Menu (Mobile)
   - Drawer อยู่เหนือ content/dialog ตอนเปิดเมนู
   - ใช้ fixed viewport overlay เฉพาะตอนเมนู Admin เปิด
   - เมนูเลื่อนขึ้น/ลงได้เอง
   - ปุ่ม Log out สามารถเลื่อนลงมาเห็นเต็มปุ่ม พร้อม safe area ด้านล่าง

3) Background Web Push — Notifications
   - เพิ่ม canonical notification producers สำหรับ Verification request/decision
   - เพิ่ม User report -> Admin notification
   - เพิ่ม Admin notice -> User notification
   - public.notifications ที่สร้างใหม่จะถูก V45 dispatcher ส่งไป send-web-push

4) Background Web Push — Chat
   - Direct User Chat -> recipient Push
   - User -> Melo Chat Support -> Admin Push
   - Admin -> Melo Chat Support -> User Push
   - Admin สามารถรับ Push ได้แม้ไม่ได้อยู่หน้า Admin Center
   - Free plan Direct Chat จะเห็นเพียงข้อความ generic ไม่เปิดเผยเนื้อหาแชท

ไฟล์ที่แก้:
- app/globals.css
- components/Header.tsx
- lib/mobileVisualViewport.ts
- supabase/migrations/20261003011500_mobile_drawer_push_all_chat_v47.sql

สำคัญ — SQL:
โปรเจกต์นี้มี migration history local/remote ไม่ตรงกันจากรอบก่อน
ดังนั้นรอบนี้อย่าใช้ `npx supabase db push` เพื่อรัน V47
ให้เปิดไฟล์ SQL V47 แล้วรันผ่าน Supabase > SQL Editor > New query > Run

หลังวางทับไฟล์ รันใน VS Code / PowerShell:
1) npx tsc --noEmit
2) อัป GitHub / Deploy Vercel ตาม workflow เดิม

Edge Function:
- รอบนี้ไม่ได้แก้ send-web-push/index.ts
- ถ้า send-web-push V45 deploy สำเร็จแล้ว ไม่ต้อง deploy Edge Function ซ้ำ

ผลตรวจใน sandbox:
- node ./node_modules/typescript/bin/tsc --noEmit => ผ่าน
