# สถานะร้านและการปิดร้านโดย Platform Admin

หน้า `/admin` แสดงสถานะจากรอบขายปัจจุบัน: เขียว = เปิดรับออเดอร์, เหลือง = รอบขายยังเปิดแต่หยุดรับออเดอร์, แดง = ร้านปิด รีเฟรชรายการทุก 30 วินาทีขณะมองเห็นหน้า และโหลดข้อมูลใหม่หลังทำรายการ

ผู้ดูแลกด **ปิดร้าน** แล้ว **ยืนยันปิดรอบขาย** ได้โดยไม่ต้องเป็นสมาชิกของร้าน หากยังมีออเดอร์ ยอดรับชำระ หรือโต๊ะค้าง จะปิดรอบไม่ได้ สามารถเลือก **หยุดรับออเดอร์ใหม่แทน** เพื่อให้พนักงานจัดการรายการเดิมต่อได้ ผู้ดูแลที่ไม่ได้เป็นสมาชิกไม่มีสิทธิ์เปิดรับออเดอร์กลับแทนร้าน

ใช้ RPC เดิม `close_store_session` และ `set_store_order_acceptance` โดยเพิ่มการตรวจ Platform Admin ฝั่งฐานข้อมูล คง shop/session locks, expected session ID, pending order/table guards, store events และ audit actor เดิม ไม่มีการเพิ่ม membership หรือเปิดสิทธิ์อ่านข้อมูลร้านแก่ผู้ใช้ทั่วไป

ไฟล์หลัก:

- `src/features/platform-admin/domain/platform-shop.ts`: ข้อมูลสถานะและรอบขาย
- `presentation/components/PlatformShopList.tsx`: รายการร้านและสถานะ
- `presentation/components/ClosePlatformShop.tsx`: การยืนยัน ปิดรอบ และหยุดรับออเดอร์
- `application/platform-admin-repository.ts` และ `infrastructure/supabase-platform-admin-repository.ts`: ขอบเขตและการเรียก backend
- Migration `202611060039_platform_shop_status_and_closure.sql`: สถานะรายการร้านและสิทธิ์ RPC

ผลตรวจ: component tests 5 ข้อ, SQL integration 21 ข้อ (fixtures rollback), lint และ production build ผ่าน ทดสอบรายการ ยืนยันปิด และข้อผิดพลาดรายการค้างบน Chromium จำลอง 390×844 และ 768×1024 ไม่พบหน้าหรือ dialog ล้นจอ หลักฐาน `artifacts/qa/admin-status-responsive.json` และภาพ `artifacts/qa/screenshots/admin-status-*` ไม่ได้ปิดร้านจริงหรือทดสอบบนอุปกรณ์จริง

Supabase ใช้ migration 039 แล้ว Frontend ต้อง deploy build ใหม่โดยผู้ใช้
