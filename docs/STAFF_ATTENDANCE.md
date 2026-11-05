# ลงเวลาและชั่วโมงงาน — 2026-11-05

- เมนู sidebar “ลงเวลาและชั่วโมงงาน” ที่ /attendance สำหรับสมาชิกของร้าน
- สมาชิกกดเข้า–ออกงานของตนเอง พร้อมยืนยัน ใช้เวลาเซิร์ฟเวอร์ ไม่รับเวลาหรือ User ID จาก client
- หนึ่งบัญชีมีรอบงานที่ยังไม่ออกได้หนึ่งรอบทั้งระบบ กันการลงเวลาซ้ำหลายอุปกรณ์/หลายสาขา การออกงานส่ง ID ของรอบที่กำลังทำอยู่และตรวจเจ้าของรอบบน server
- ชั่วโมงเริ่มจากการกดลงเวลา ไม่สร้างเวลาเข้างานย้อนหลังจากผู้เปิด/ปิดร้าน และไม่ผูกกับสถานะรับออเดอร์/รอบขาย ไม่มีการหักพักหรือคำนวณค่าจ้าง
- STAFF ดูรายงานของตนเอง OWNER ดูทุกคนในสาขา รวมประวัติของพนักงานที่ถูกถอนสิทธิ์แล้ว ไม่มี public access หรือ direct INSERT/UPDATE/DELETE บนตาราง
- แบ่งชั่วโมงตามเที่ยงคืนใน timezone ร้าน สัปดาห์เริ่มจันทร์ เดือนตามปฏิทิน รวมเฉพาะช่วงวันที่เลือก สูงสุด 366 วันต่อคำขอ แสดง 50 แถวต่อหน้า คำนวณวินาทีแล้วแสดงชั่วโมง/นาที
- รอบที่ยังไม่ออกใช้เวลา server ปัจจุบันเป็นปลายช่วง และมีป้ายยอดชั่วคราว ไม่เปลี่ยนเป็นการออกงานอัตโนมัติ ต้องกดออกงาน
- รีเฟรชหลัง mutation, focus, reconnect และทุก 60 วินาทีขณะหน้าแสดง ไม่มี Realtime channel เพิ่ม
- migration 036 ถูกนำขึ้น Supabase แล้ว ชุดทดสอบ SQL 22 assertions ผ่านก่อนและหลัง migration ด้วย rollback fixtures ทั้งหมด Component tests 4 ข้อผ่าน (confirmation, cross-branch clock-out, report filters, invalid range)
- Responsive QA completed in a separate headless Chromium using the actual AttendancePage, AppShell and query/mutation hooks with in-memory/local test repositories. Viewports: 320×740, 390×844, 768×1024 and 1024×768. This does not certify physical Safari/iOS devices. No production attendance data changed.
- ผลตรวจ frontend: lint ผ่าน, ชุดทดสอบทั้งหมด 36 ไฟล์ / 112 tests ผ่าน, TypeScript และ production/PWA build ผ่านหลังแก้ type ของ test helper

## Responsive flow verification — follow-up

- At each of the four sizes: clock-in cancellation, confirmed clock-in, page reload restoring the active shift, clock-out cancellation and confirmed clock-out passed.
- Daily, weekly and monthly report selection passed at all four sizes (12 scenarios). The fixture mirrors the SQL-tested overnight case: Oct 31 22:00 to Nov 1 02:00 gives 2h per day, 4h in the same Monday-based week, and 2h per month across the boundary.
- Reversed-date validation and empty-period state passed at every size. Long employee names wrap inside cards. All tested controls/cards stay inside the viewport and all visible main buttons have at least 44px height. No JavaScript page errors.
- Updated the filter to read named native date/select controls with FormData on submit. This avoids stale controlled-date values during browser picker changes.
- Added a report heading identifying the applied day/week/month grouping, automatic jump to the results after loading, and scroll margins to clear fixed navigation/header controls.
- After edits: attendance component tests 4/4, lint, TypeScript, production/PWA build passed. No database changes were needed for this follow-up.
- Evidence: artifacts/qa/attendance-responsive-20261105.json and artifacts/qa/screenshots/attendance-{width}-{day|week|month|clock-in}-20261105.png.

## Clock-in geofence — 2026-11-05

- On confirmation of clock-in only, request a fresh high-accuracy browser position (maximumAge 0, timeout 15 seconds). Location denial, unavailable GPS and timeout show actionable messages. Clock-out does not request GPS.
- Migration 037 applied: active membership and server-side distance check against the selected shop_locations row and its 100m radius. Reject missing/out-of-range/NaN coordinates, accuracy outside 0–100m, readings older than 60 seconds or more than 10 seconds in the future, and shops without configured coordinates.
- The old one-argument clock-in RPC has no authenticated/PUBLIC/anon EXECUTE permission. The checked security-definer overload calls it internally after validation and holds shop/location share locks. Direct attendance writes remain prohibited.
- Raw employee coordinates are used for validation only and are not stored. Browser coordinates can be spoofed; this is a proximity check, not proof of physical presence.
- Hosted rollback tests after migration: 16/16 geofence assertions and 22/22 attendance regression assertions passed. No production shifts were created or edited.
- Frontend redeployment is required. Older frontend versions cannot use the unchecked clock-in RPC after this migration.
- Frontend geofence verification: permission-denial prevents the clock-in request; confirmation captures a fresh reading; clock-out never requests GPS. Adapter tests cover high accuracy/no cached position, GPS timestamp, denial, unavailability, timeout and unsupported devices. Full frontend gate passed: 37 files / 118 tests, lint, TypeScript and production/PWA build.

## ไฟล์และหน้าที่

- src/features/attendance/domain/attendance.ts — ข้อมูลรายงาน รูปแบบเวลา ข้อความ error
- src/features/attendance/application/attendance-context.ts — repository port และ context
- src/features/attendance/application/use-attendance.ts — server state, mutations, cache refresh
- src/features/attendance/infrastructure/supabase-attendance-repository.ts — RPC adapter
- src/features/attendance/presentation/AttendancePage.tsx — ลงเวลา ตัวกรอง สรุปและรายการพนักงาน
- supabase/migrations/202611050036_staff_attendance.sql — schema, RLS, RPC, split/aggregate เวลา
- supabase/tests/0025_staff_attendance.test.sql — สิทธิ์ ข้ามวัน/เดือน สัปดาห์ pagination และ clock flow
