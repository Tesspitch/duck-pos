# Phase 4 Decisions — Staff POS & Queue

วันที่: 28 ตุลาคม 2026

## Confirmed from SRS

- Owner และ Staff ที่เป็นสมาชิกสถานะ `ACTIVE` ใช้ POS, Queue และบันทึกการชำระเงินได้
- POS และ QR ใช้ Orders, Store Session, Daily Queue และเลขคิวชุดเดียวกัน
- สถานะปกติเปลี่ยนตามลำดับ `QUEUED → PREPARING → READY → COMPLETED`
- Payment Status แยกจาก Order Status
- รองรับ `CASH` และ `BANK_TRANSFER` โดยพนักงานเป็นผู้ยืนยัน
- ทุกคำสั่งสำคัญตรวจสิทธิ์และความถูกต้องใน PostgreSQL RPC

## Phase 4 assumptions

- `COMPLETED` ทำได้เมื่อออเดอร์เป็น `PAID` เท่านั้น เพื่อไม่ปิดรายการขายก่อนรับชำระ
- ยกเลิกได้จาก `QUEUED`, `PREPARING` หรือ `READY` และต้องมีเหตุผล 3–300 ตัวอักษร
- ออเดอร์ที่ `PAID` แล้วจะยังยกเลิกไม่ได้ เพราะเงื่อนไข Refund ใน SRS ยังไม่สรุป
- เงินโอนต้องบันทึกยอดเท่ากับยอดออเดอร์ ส่วนเงินสดรับเกินยอดได้และระบบคำนวณเงินทอน
- POS ไม่ทำงาน Offline และไม่ queue mutation ในเครื่อง เมื่อกลับมา Online จะ refetch ข้อมูลจริง
- หน้าเปิด/ปิด Store Session ยังไม่ทำใน Phase 4 ตามแผนเดิม แต่ POS แสดงสถานะร้านและปฏิเสธการสร้างออเดอร์เมื่อไม่มี Session ที่เปิด

## Deferred decision

- ผู้ใดคืนเงินได้, คืนบางส่วนได้หรือไม่ และการยกเลิกหลังรับเงิน ต้องอนุมัติก่อนเปิด Refund UI

