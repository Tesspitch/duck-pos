# Phase 3 — Customer QR Ordering

**Status:** Completed — Phase 4 approved 28 October 2026

## Phase summary

- Public QR menu route `/order/:shopId` โดยลูกค้าไม่ต้อง Login
- Product customization, cart และราคาแสดงผลฝั่งลูกค้า
- Browser geolocation ก่อน Checkout และตรวจซ้ำฝั่ง PostgreSQL ภายใน 100 เมตร
- Edge Function rate limiting ก่อนเรียก server-authoritative atomic checkout
- Idempotent order creation, daily queue counter และ secure token-scoped tracking
- Tracking polling ทุก 7 วินาที เฉพาะเมื่อหน้าเปิด และหยุดเมื่อ terminal status
- Owner QR page `/settings/qr` สำหรับคัดลอกลิงก์ เปิดหน้าลูกค้า ดาวน์โหลด SVG/PNG และพิมพ์ป้าย QR

## Architecture

- `customer-ordering/domain`: public menu, cart และ tracking models
- `customer-ordering/application`: repository/location ports, queries, checkout และ Zustand cart
- `customer-ordering/infrastructure`: Supabase RPC/Edge Function adapter และ Browser Geolocation adapter
- `customer-ordering/presentation`: Public Menu, Cart และ Tracking pages
- PostgreSQL เป็นผู้ตรวจ availability, option rules, ราคา, geofence, business date และ queue number

## Security

- Anonymous ไม่มีสิทธิ์อ่านตาราง Catalog หรือ Order โดยตรง
- Public menu และ tracking เปิดเฉพาะ RPC ที่คืนข้อมูลจำกัดขอบเขต
- Order creation RPC ให้เฉพาะ `service_role`; Browser ต้องผ่าน `customer-checkout` Edge Function
- Tracking token เก็บเป็น SHA-256 hash และแยกจาก Queue Number
- Edge Function จำกัด origin และ rate limit ด้วย salted client fingerprint

## Performance and cache

- Public menu stale 5 นาที, gc 30 นาที และไม่ cache Checkout response
- Cart เก็บใน `sessionStorage` เฉพาะ browser session
- Tracking ใช้ adaptive polling 7 วินาที, pause เมื่อ hidden และ refetch เมื่อ focus
- Public routes lazy-loaded
- QR สร้างใน Browser จาก `/order/:shopId` โดยไม่ใช้ Supabase compute หรือ Storage

## Current test results

- Production build ผ่าน
- ESLint ผ่าน
- Unit tests ผ่าน 8/8
- Hosted Supabase pgTAP schema/security ผ่าน 20/20
- Atomic checkout functional test ผ่าน 5/5 และ rollback ข้อมูลทดสอบทั้งหมด
- Public menu smoke test ผ่านกับ Hosted Supabase
- Edge Function smoke test ผ่าน: JWT/CORS/rate-limit path และตอบ `Shop is closed` ถูกต้อง
- Hosted migration `013` ผ่าน และ pgTAP สิทธิ์ Shop Location RPC ผ่าน 3/3
- Owner Shop Location RPC functional test ผ่าน โดยได้รัศมี 100 เมตรและ rollback ข้อมูลทดสอบ
- Shop Settings smoke test ผ่าน: โหลดพิกัด Latitude/Longitude และคำสั่งบันทึกผ่าน Clean Architecture

## Remaining issues / deferred validation

- Browser Checkout แบบครบเส้นทางยังไม่สร้าง order จริง เพราะร้านปิดและ Store Session UI อยู่ Phase 5; business logic, geofence, idempotency, queue และ tracking ผ่าน functional test บนฐานข้อมูลจริงแล้ว
- `ALLOWED_ORIGINS` ของ Edge Function ใช้ `http://localhost:5173` ระหว่างพัฒนา ต้องเพิ่ม Cloudflare Pages production origin ใน Phase 9

## Next phase proposal

Phase 4 — Staff POS & Queue: POS สำหรับมือถือ/แท็บเล็ต, manual order, queue status, Realtime แบบจำกัด channel, payment recording และ reconnection handling
