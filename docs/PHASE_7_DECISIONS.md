# Phase 7 — LINE Integration Decisions

## Confirmed interpretation

- Shop ID เป็นเพียงตัวระบุร้าน ผู้รับต้องได้รับ Owner approval ก่อนเสมอ
- MVP รองรับ LINE source ประเภทผู้ใช้บุคคล (`user`) ตาม flow ที่ยืนยันไว้; group/room ยังไม่ถูกอนุมัติใน SRS
- Closing report ถูก enqueue ใน transaction เดียวกับการปิด Store Session แต่การเรียก LINE API ทำภายหลัง จึงไม่ทำให้ POS หรือการปิดร้านล้มเมื่อ LINE ขัดข้อง
- Periodic report ใช้ timezone ของร้าน รองรับสูงสุด 6 รอบต่อวันเพื่อลด Cron/Function usage บน Free Tier
- Periodic report แสดงทั้งยอดสะสมของวันทำการและยอดเพิ่มจากรายงานตามเวลาก่อนหน้า
- Delivery retry สูงสุด 5 ครั้งด้วยช่วง 1, 5, 15 และ 60 นาที และใช้ Job UUID เป็น LINE retry key
- Webhook event, closing session และ periodic minute มี idempotency key แยกกัน
- Owner เห็นเพียง display name และท้าย LINE User ID; ค่าเต็มไม่ถูกส่งให้ Frontend
- Notification settings, approval และ revocation ผ่าน server-authoritative RPC เท่านั้น

## Required secrets and external configuration

- `LINE_CHANNEL_SECRET` — ใช้ตรวจ `x-line-signature`
- `LINE_CHANNEL_ACCESS_TOKEN` — ใช้ profile, reply และ push API
- `LINE_WORKER_SECRET` — fallback สำหรับเรียก worker โดยตรง; Database Webhook ใช้ project secret key
- LINE Developers webhook URL ต้องชี้ไปที่ `line-webhook` Edge Function
- Database Webhook บน `notification_dispatch_signals` event `INSERT` เรียก worker เฉพาะเมื่อมีงาน
- Cron ทุกนาทีเรียกเฉพาะ database functions สำหรับ due periodic/retry และไม่เรียก Edge Function เมื่อคิวว่าง
- การเปิดร้านส่งข้อความสถานะ `OPENING` ให้ผู้รับที่ Owner อนุมัติ และการปิดร้านส่งรายงานทุกครั้ง แม้ไม่มีออเดอร์หรือยอดรับ
- Database Webhook ใช้ service-role JWT ที่ตรวจโดย Supabase Gateway; worker ยอมรับเฉพาะ role `service_role`
- Cron recovery ครอบคลุมงาน `PENDING`, `RETRY` และ `PROCESSING` ที่ค้าง เพื่อไม่ให้งานสูญหายเมื่อ webhook เรียกไม่สำเร็จ

## Deferred

- LINE group/room subscriptions จนกว่าจะยืนยัน business rule และ approval identity
- Rich Message/Flex Message; MVP ใช้ข้อความ plain text เพื่อลด payload และ maintenance
- Customer order alerts ผ่าน LINE ยังคงอยู่นอกขอบเขต

