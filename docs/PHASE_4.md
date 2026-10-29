# Phase 4 — Staff POS & Queue

**Status:** Completed — Phase 5 approved on 29 October 2026

## Phase summary

- Mobile/tablet Staff POS พร้อม Product Grid, customization, quantity, notes และ cart
- POS order ใช้ server-authoritative pricing, atomic queue และ idempotency key
- Queue แสดงออเดอร์ QR/POS ร่วมกันและเปลี่ยนสถานะแบบ optimistic concurrency
- Manual Cash / Bank Transfer พร้อมคำนวณเงินทอนและป้องกันรับชำระซ้ำ
- Supabase Realtime subscribe เฉพาะ `shop_id` และ refetch ข้อมูลจริงเมื่อมี event/กลับมา online

## Clean Architecture

- `staff-orders/domain`: Order, Payment และ POS cart rules
- `staff-orders/application`: Ports, query/mutation hooks, schemas และ client cart state
- `staff-orders/infrastructure`: Supabase RPC repository และ Realtime adapter
- `staff-orders/presentation`: POS, Queue และ touch-friendly components

## Business rules

- Staff/Owner ต้องเป็นสมาชิก ACTIVE ของร้าน
- POS ต้องมี Store Session ที่เปิด และใช้ Daily Queue เดียวกับ QR
- Status ปกติเรียง `QUEUED → PREPARING → READY → COMPLETED`
- ปิดรายการได้เมื่อชำระเงินแล้ว และยกเลิกออเดอร์ที่ชำระแล้วไม่ได้จนกว่าจะอนุมัติ Refund flow
- การยกเลิกต้องมีเหตุผล และทุก status/payment mutation บันทึก event หรือ audit log

## Security

- Frontend ไม่มีสิทธิ์ insert/update Orders หรือ Payments โดยตรง
- RPC เป็น Security Definer แต่ตรวจ Membership, current state และ business invariants ก่อนเขียนข้อมูล
- Anonymous เรียก Staff RPC ไม่ได้ และ RLS จำกัดข้อมูลตามร้าน

## Performance and cache

- Queue RPC คืน active orders สูงสุด 100 รายการพร้อม items/options ในคำขอเดียว
- Query stale 10 วินาที; Realtime ใช้เป็น invalidation signal ไม่ใช้ payload เป็น source of truth
- Subscription filter ด้วย Shop ID, unsubscribe เมื่อเปลี่ยนหน้า/ร้าน และ refetch เมื่อ online
- POS/Queue เป็น lazy route และ cart เก็บเฉพาะ sessionStorage

## Tests

- Production migration `014` สำเร็จ
- Hosted pgTAP schema/security ผ่าน 16/16
- Hosted functional flow ผ่าน 13/13: POS creation, idempotency, server pricing, queue status, cash payment/change และ completion โดย rollback ข้อมูลทดสอบ
- Production build ผ่าน และ ESLint ผ่าน
- Unit tests ผ่าน 10/10
- Browser smoke ผ่าน: POS โหลด catalog/สถานะร้าน, Queue โหลด empty state และ Realtime แสดง `พร้อม`
- Console ไม่มี warning/error บน POS และ Queue
- Responsive smoke ผ่าน: Mobile 390px และ Tablet 1024px ไม่มี horizontal overflow และ touch buttons สูงอย่างน้อย 44px

## Remaining issues / deferred validation

- ร้าน Production ปัจจุบันปิดอยู่ จึงไม่ได้สร้างออเดอร์ถาวรผ่าน Browser; flow เดียวกันผ่าน transaction test บนฐานข้อมูลจริงแล้ว
- Refund UI และการยกเลิกหลังรับเงินรออนุมัติกติกาธุรกิจ
- Store Session open/close UI อยู่ Phase 5 ตามแผนและไม่ถูกทำล่วงหน้า

## Next phase proposal

Phase 5 — Store Management: Owner เปิด/ปิดร้าน, Store Session, pending order checks, store history และ atomic close operations

