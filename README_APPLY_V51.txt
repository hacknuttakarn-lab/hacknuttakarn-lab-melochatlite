Melo Chat Lite V51 overlay

แก้เฉพาะส่วนที่ร้องขอ:
1. Home lifestyle filters อ่าน lifestyle_preferences จริงจาก profiles และ map เป็น tag กลาง Coffee/Travel/Fitness/Foodie/Music/Pets/Art/Beach
2. Profile ไม่ fallback ชื่อไป email/display_name อีก: ใช้ first_name และถ้าไม่มีใช้ Melo User
3. Onboarding บังคับข้อมูล Step 1, Step 2 และ Lifestyle Step 3 ทุกหมวด; Gallery 6 รูปยังไม่บังคับตาม requirement เดิม
4. Settings บังคับข้อมูลส่วนตัว + กำลังมองหา + รสนิยมทางเพศ + Lifestyle ทุกหมวดก่อน Save; รูปโปรไฟล์/แกลเลอรียังไม่บังคับใน Settings
5. เพิ่มเครื่องหมาย * ในช่อง/หมวดที่บังคับของ Settings และ Lifestyle onboarding

วิธีใช้:
- แตก ZIP แล้ววางทับ root ของโปรเจกต์เดิม
- ไม่ต้องรัน SQL / migration
- แนะนำรัน: npx tsc --noEmit
- จากนั้น npm run dev

Validation:
- npx tsc --noEmit ผ่าน
- npm run build ใน sandbox รันไม่ได้เพราะ binary next ไม่มี execute permission ใน environment นี้ (ไม่ใช่ TypeScript error)
