MELO WEB OVERLAY — POST MEDIA / LOCATION + PROFILE 2-COL + ACTIVITY SHARE V11
Date: 2026-08-28

วางทับ:
D:\project\melochat-web

BASELINE
========
ให้วางต่อจาก V10 + V10.1 ล่าสุด

CREATE POST / EDIT POST
=======================
- Popup Create Post เพิ่มปุ่ม "เพิ่มรูปภาพ"
- เลือกได้หลายรูป สูงสุด 8 รูป
- Preview รูปก่อนโพสต์ + ลบรูปก่อนบันทึกได้
- รูปละไม่เกิน 12 MB
- อัปโหลดเข้า Storage bucket เดิม: social-posts
- Path ใช้ userId/posts/postId/... เพื่อเข้ากับ own-folder policy
- เพิ่มปุ่ม "เพิ่มโลเคชั่น"
- พิมพ์ชื่อสถานที่เองได้
- ใช้ Browser Current Location ได้ (latitude/longitude)
- ลบ Location ก่อนบันทึกได้

EDIT POST
=========
- Edit Post ใช้ Popup เดิม
- เห็นรูปเดิม
- ลบรูปเดิม / เพิ่มรูปใหม่ได้
- แก้ Location / ลบ Location / ใช้ตำแหน่งปัจจุบันได้
- รักษา Trip / Event / Community attachment เดิม
- รูปที่ผู้ใช้เอาออกจะถูกลบจาก Storage แบบ best-effort หลัง Update สำเร็จ

TRIP / EVENT / COMMUNITY POST
=============================
- Popup ที่เปิดจาก Activity รองรับ attachment ทั้ง 3 แบบ
- เพิ่มตัวเลือก Privacy เฉพาะ Activity:
  Trip members
  Event participants
  Community members
- Share Post จะส่ง context ของ Trip/Event/Community ไปด้วย
  พร้อม Activity title, subtitle, activity link และ post link
- Share Post ยังคงแชร์เข้า Messages / Trips / Events / Community chat ได้
- Community detail เพิ่มเมนู ... แบบ Event สำหรับ Share/Create Post/Members/Chat

PROFILE
=======
- ส่วนข้อมูลที่ซ่อน เปลี่ยน Layout Desktop เป็น 2 คอลัมน์
- Languages + Interests อยู่ข้างกัน
- More details 6 รายการแบ่งเป็น 2 คอลัมน์ (3 แถว)
- ลดความสูงของส่วน Profile อย่างชัดเจน
- Mobile ยังคง 1 คอลัมน์เพื่ออ่านง่าย
- โพสต์ของตัวเองใน Profile เพิ่มเมนู ...
  Edit Post -> Popup
  Share Post -> Popup

LIGHT / DARK / LANGUAGE
=======================
- รองรับ Light/Dark ด้วย CSS variables เดิม
- Composer เพิ่มข้อความครบ TH / EN / DE / ZH / JA / KO

FILES
=====
components/feed/socialFeedWebData.ts
components/feed/SocialPostComposerModal.tsx
components/feed/SocialPostComposerModal.module.css
components/feed/ShareSocialPostModal.tsx
components/feed/ShareSocialPostModal.module.css
components/profile/ProfileOverviewExperience.tsx
components/profile/ProfileOverviewExperience.module.css
components/activity/ActivityDetailActions.tsx
components/activity/ActivityDetailActions.module.css
components/activity/ShareActivityToChatWeb.tsx
components/activity/ShareActivityToChatWeb.module.css
components/activity/ActivityDetailExperience.tsx
components/activity/ActivityDetailExperience.module.css

ไม่มี SQL / Migration / package ใหม่
ไม่แตะ Android / iOS
