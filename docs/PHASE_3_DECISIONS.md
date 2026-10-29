# Phase 3 — Decisions and Assumptions

ข้อกำหนดต่อไปนี้ใช้เพื่อให้ Phase 3 เดินหน้าได้โดยไม่ขยายขอบเขตเกิน SRS:

- Public QR URL ใช้ Shop UUID: `/order/:shopId` ยังไม่เพิ่ม custom slug
- MVP ไม่ขอชื่อเล่นลูกค้า เพื่อลดข้อมูลส่วนบุคคลและจำนวนช่องกรอก
- GPS ต้องมี `accuracy <= 100 เมตร` และ timestamp อายุไม่เกิน 60 วินาที; หากไม่ผ่านให้ลองใหม่หรือสั่งผ่านพนักงาน
- Checkout ใช้ Store Session ที่เปิดอยู่เป็นแหล่ง business date; Phase 3 สร้างเฉพาะ schema dependency ส่วน UI เปิด–ปิดร้านยังอยู่ Phase 5
- ไม่มีส่วนลดใน Phase 3 ราคาทั้งหมดคำนวณจาก product และ option ที่พร้อมขายในฐานข้อมูล
- Tracking token เป็น secret แบบสุ่ม เก็บเฉพาะ SHA-256 hash และไม่ใช้ Queue Number เป็นสิทธิ์เข้าถึง
- Customer tracking ใช้ polling 7 วินาทีเมื่อแท็บเปิด หยุดเมื่อซ่อนหรือสถานะ terminal

ประเด็น Store close ที่มีออเดอร์ค้าง, cancellation/refund และ wait-time estimate ยังไม่ถูกนำมาใช้ก่อน Phase ที่เกี่ยวข้อง
