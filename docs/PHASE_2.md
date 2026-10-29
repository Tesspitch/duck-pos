# Phase 2 — Product Catalog

**Status:** Completed — 28 ตุลาคม 2026

## สรุป

Phase 2 เพิ่มระบบจัดการหมวดหมู่ สินค้า กลุ่มตัวเลือก ท็อปปิง รูปสินค้า และสถานะพร้อมขาย โดยไม่รวม public customer menu หรือ checkout ซึ่งเป็น Phase 3

## Business rules

- ราคาเก็บเป็น integer หน่วยสตางค์
- Owner เพิ่ม/แก้ไข/ลบโครงสร้างเมนูและอัปโหลดรูปได้
- Staff และ Owner เปิด/ปิดขายสินค้าและตัวเลือกได้
- สินค้าหมดไม่ถูกเปิดเองเมื่อเริ่มรอบร้านใหม่
- กลุ่มตัวเลือกระบุจำนวนเลือกขั้นต่ำและสูงสุด
- การอ้างอิง category/product/option ข้ามร้านถูกป้องกันด้วย composite foreign key และ RPC validation

## Security

- ตาราง Catalog เปิด RLS และอ่านได้เฉพาะสมาชิก ACTIVE ของร้าน
- Mutation ทั้งหมดผ่าน RPC แบบ server-side RBAC; ไม่มี direct table write จาก frontend
- Anonymous ยังอ่าน Catalog ไม่ได้จนกว่า Phase 3 จะมี public menu boundary
- Storage upload/delete ตรวจ Owner และบังคับ path ขึ้นต้นด้วย Shop ID
- Bucket จำกัด 5 MB และ MIME type รูปภาพที่อนุญาต
- Catalog mutation และ availability change เขียน Audit Log

## Performance และ cache

- โหลด catalog แบบ nested query ครั้งเดียว ลด N+1
- TanStack Query: `staleTime` 5 นาที, `gcTime` 30 นาที
- Invalidate เฉพาะ query ของร้านหลัง mutation
- Route `/catalog` lazy-loaded
- รูปถูก resize/compress ฝั่ง browser เป็น WebP เป้าหมายไม่เกินประมาณ 200 KB
- ใช้ immutable versioned path และ Cache-Control 1 ปี
- รูปนอก viewport ใช้ lazy loading

## Test plan

- TypeScript production build
- ESLint
- Unit test การแปลงเงินบาทเป็นสตางค์
- pgTAP ตรวจ schema, RLS, table grants, RPC grants และ Storage bucket
- Hosted Supabase smoke test หลัง apply migrations

## ผล Quality Gate

- Production build ผ่าน
- ESLint ผ่าน
- Unit tests ผ่าน 7/7
- Hosted Supabase pgTAP ผ่าน 33/33 assertions
- Smoke test ผ่าน: Profile, Active Shop, Multi-shop switching, Catalog, Shop Settings และ Self-revocation UI guard
- ยืนยัน migration `006–010` บน Hosted Supabase แล้ว

## ข้อสมมติ

- ราคาเพิ่มของตัวเลือกเป็นศูนย์หรือจำนวนบวกเท่านั้น เพราะส่วนลดยังไม่ถูกอนุมัติ
- ลบ Category ที่มี Product ไม่ได้; Owner ต้องย้ายหรือลบสินค้าก่อน
- ใช้รูป optimized ชุดเดียวใน MVP; responsive display size ควบคุมด้วย CSS โดยไม่พึ่งบริการแปลงรูปเพิ่มเติม

## ยังไม่รวม

- Public menu และ anonymous catalog API
- Server-authoritative checkout validation
- Cart, ordering และ queue
- Realtime catalog subscription; Phase 2 ใช้ query invalidation/refetch เพื่อลด message quota

## ส่วนเสริมที่ได้รับอนุมัติ

- `/profile` แสดงบัญชี Google ที่กำลังใช้งาน, Email, Provider และ Supabase User ID
- ผู้ใช้แก้ชื่อที่แสดงของตนเองผ่าน server-authoritative RPC
- `/settings/shop` ให้ Owner แก้ชื่อและอัปโหลดโลโก้ร้าน
- โลโก้ถูกบีบอัดเป็น WebP เป้าหมายประมาณ 100 KB และเก็บด้วย immutable versioned path
- ไม่รวม Store Session หรือการเปิด–ปิดร้าน ซึ่งยังคงอยู่ Phase 5
- มีตัวเลือกร้านที่กำลังใช้งานร่วมกันทุกหน้า เพื่อรองรับ Account ที่มีหลายร้าน/สาขา
- `/toppings` แยกการจัดการท็อปปิงออกจากหน้าเมนูสินค้า
- Owner สร้างหมวดท็อปปิงครั้งเดียวและเลือกหมวดหมู่เมนูได้หลายหมวด
- สินค้าปัจจุบันและสินค้าใหม่ในหมวดที่เลือกได้รับท็อปปิงอัตโนมัติผ่าน server-side sync
- Staff และ Owner เปิด/ปิดขายท็อปปิงจากคลังกลางครั้งเดียวและมีผลกับทุกเมนูที่เกี่ยวข้อง
- Migration `025` แปลงกลุ่มท็อปปิงเดิมเป็น template กลางโดยคงแถวเดิมไว้สำหรับประวัติออเดอร์
- ลำดับหมวดหมู่ สินค้า หมวดท็อปปิง และท็อปปิงถูกกำหนดต่อท้ายอัตโนมัติ ไม่แสดงช่องลำดับแก่ผู้ใช้
- ยืนยัน Migration `025` บน Hosted Supabase แล้ว
- Hosted pgTAP reusable topping library ผ่าน 22/22 assertions และ rollback ข้อมูลทดสอบแล้ว
- Browser smoke `/toppings` ผ่านทั้ง desktop และ mobile 390×844 โดยไม่มี alert, console error หรือ horizontal overflow
