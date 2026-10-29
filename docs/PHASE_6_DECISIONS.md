# Phase 6 — Sales Analytics Decisions

## Confirmed interpretation

- Sales Dashboard และ Sales History ใช้ได้เฉพาะสมาชิก `OWNER` สถานะ `ACTIVE`
- ช่วงวันที่อ้างอิง `orders.business_date` และรวมทั้งวันเริ่มต้นกับวันสิ้นสุด
- จำกัดช่วงรายงานไม่เกิน 366 วันเพื่อควบคุม query cost บน Supabase Free Tier
- Gross Order Value คือผลรวม `orders.total_satang` ของออเดอร์ที่ไม่ `CANCELLED`
- Net Collected Sales คือผลรวม `payments.paid_amount_satang` ที่ payment ยังเป็น `PAID`; รายการ `REFUNDED` ไม่นับเป็นเงินรับสุทธิ
- Paid/Unpaid Orders ไม่นับออเดอร์ที่ยกเลิก ส่วน Cancelled Orders แสดงแยกต่างหาก
- Products Sold และ Best-selling Products นับเฉพาะออเดอร์ที่จ่ายแล้วและไม่ยกเลิก
- Average Order Value ใช้ Gross Order Value หารจำนวนออเดอร์ที่ไม่ยกเลิก
- QR vs POS Sales ใช้ยอดรับเงินจริงจาก payment สถานะ `PAID`
- Daily/Monthly report ใช้ตัวเลือกการจัดกลุ่ม `DAY` หรือ `MONTH`
- Store Session filter ใช้ Session ID และดึงตัวเลือกสูงสุด 100 รอบล่าสุด
- CSV export ใช้ filter/sort เดียวกับหน้าประวัติ ดึงแบบ paginated batch และจำกัด 5,000 รายการต่อครั้ง

## Deferred

- ต้นทุน กำไร ค่าใช้จ่าย และ Profit Margin ไม่อยู่ในขอบเขต
- Refund command/UI ไม่ถูกเพิ่มใน Phase 6; รายงานรองรับสถานะที่มีอยู่แล้ว
- LINE Closing/Periodic Report และ report delivery history อยู่ Phase 7
- Advanced BI, materialized view และ data warehouse ไม่จำเป็นสำหรับ MVP
