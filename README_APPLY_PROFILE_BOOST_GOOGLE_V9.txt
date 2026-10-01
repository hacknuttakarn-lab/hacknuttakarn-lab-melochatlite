Melo Chat Lite — Profile Boost / Google Auth V9
===============================================

ฐานงาน
- ต่อจาก melochat-web-lite(8).zip + Overlay V2-V8 ล่าสุด
- แก้เฉพาะ Profile post boost / Feed ranking / Login & Register Google OAuth

สิ่งที่แก้
1) Popup หลังบูทโพสต์
- เอา browser alert ออก
- ใช้ themed modal ของ Melo Chat
- รองรับ TH / EN / DE และ Dark / Light

2) ระยะห่างโพสต์ใน Profile
- เพิ่ม spacing ระหว่าง post cards ให้ชัดเจนขึ้น

3) Boost ranking
- เพิ่ม RPC ชื่อ get_social_feed_boosted เพื่อไม่ชน/ไม่พึ่ง RPC เก่าที่อาจถูก cache หรือ overload
- คืน boosted_at มาที่ client
- Feed และ Profile sort ด้วย boosted_at ก่อน created_at
- หลังบูท Profile จะย้ายโพสต์นั้นขึ้นบนทันที แล้ว refresh จาก DB
- Feed page ฟัง event melo-feed-updated เพื่อ refresh หากเปิดอยู่

4) Google Login / Register
- เพิ่มปุ่ม Google ใน /login และ /register
- หลัง Google OAuth สำเร็จ redirect ไป /onboarding
- ถ้า user onboarding_completed แล้ว หน้า onboarding เดิมจะ redirect ต่อไป /account อัตโนมัติ
- ไม่เก็บ Google Client Secret ใน client code

SQL ที่ต้องรัน
----------------
supabase/migrations/20261001184500_social_post_boost_feed_v9.sql

Supabase CLI:
cd D:\project\melochat-web-lite
npx supabase db push

Google OAuth Setup
------------------
A) Google Auth Platform / Google Cloud
1. สร้าง/เลือก Google Cloud Project
2. ตั้ง Branding / Audience
3. Data Access ใช้เฉพาะ scope พื้นฐานสำหรับ login:
   - openid
   - email
   - profile
4. Create OAuth Client ID แบบ Web application
5. Authorized JavaScript origins:
   - http://localhost:3000
   - https://โดเมนจริงของ Melo Chat
6. Authorized redirect URI:
   - ใช้ Callback URL ที่ Supabase Dashboard > Authentication > Providers > Google แสดงให้
   - รูปแบบทั่วไป: https://<project-ref>.supabase.co/auth/v1/callback

B) Supabase Dashboard
1. Authentication > Providers > Google
2. Enable Google
3. ใส่ Google Client ID + Client Secret
4. Authentication > URL Configuration
5. Site URL = โดเมนจริงของ Melo Chat
6. Redirect URLs เพิ่มอย่างน้อย:
   - http://localhost:3000/onboarding
   - https://โดเมนจริง/onboarding

คำสั่งตรวจ
----------
cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run dev

TypeScript check ที่รันในชุดแก้
--------------------------------
PASS (Exit Code 0) เมื่อทดสอบ source จริงโดยไม่นำโฟลเดอร์ backup/overlay เก่าเข้าร่วม TypeScript scan
หมายเหตุ: ใน source เดิมมีโฟลเดอร์ backup/overlay เก่าที่เก็บ .tsx และมี relative import ไม่ครบ ทำให้ full scan ที่รวม backup เหล่านั้น error อยู่แล้ว ซึ่งไม่ใช่ error จาก V9

ไฟล์ที่แก้/เพิ่ม
----------------
components/lite/LiteMockExperience.tsx
components/lite/LiteMockExperience.module.css
components/feed/socialFeedWebData.ts
components/feed/SocialFeedExperience.tsx
components/auth/AuthFrame.module.css
lib/supabase/browser.ts
app/login/page.tsx
app/register/page.tsx
supabase/migrations/20261001184500_social_post_boost_feed_v9.sql
README_APPLY_PROFILE_BOOST_GOOGLE_V9.txt
