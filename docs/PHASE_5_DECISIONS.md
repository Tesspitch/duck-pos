# Phase 5 Decisions — Store Management

วันที่: 28 ตุลาคม 2026

## Confirmed from SRS

- Owner เปิดและปิดร้านผ่านเว็บ
- การเปิดร้านสร้าง Store Session และเปิดรับออเดอร์
- ระบบป้องกัน Session เปิดซ้ำ
- การปิดร้านต้องตรวจออเดอร์ค้างและทำเป็น atomic operation
- Business Date ของ Session ที่เปิดอยู่ไม่เปลี่ยนเมื่อข้ามเที่ยงคืน

## Phase 5 assumptions

- เฉพาะ `OWNER` ที่เป็นสมาชิก `ACTIVE` เปิดหรือปิดร้านได้
- ออเดอร์สถานะ `QUEUED`, `PREPARING` หรือ `READY` ถือเป็นออเดอร์ค้าง
- หากมีออเดอร์ค้างจะปิดร้านไม่ได้ และไม่มี force-close ใน MVP
- Business Date คำนวณครั้งเดียวตอนเปิดร้านตาม timezone ของร้าน
- Store History แสดง 20 รอบล่าสุด พร้อมจำนวนออเดอร์และยอดรับเงินจริงของแต่ละรอบ
- การทดสอบจะเปิด/ปิด Session ภายใน transaction และ rollback เพื่อไม่เปลี่ยนสถานะร้านจริง

## Deferred decisions

- หากต้องการ force-close พร้อมออเดอร์ค้าง ต้องกำหนดสิทธิ์และวิธีจัดการออเดอร์เหล่านั้นก่อน
- Closing Report และ LINE job ทำใน Phase 7 ตามแผน

