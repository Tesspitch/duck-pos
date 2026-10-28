# Phase 1 — Database & Security Foundation

## ขอบเขตที่ดำเนินการ

- React/Vite/TypeScript/Tailwind application shell ขั้นต่ำ
- Modular Monolith พร้อม Clean Architecture boundaries (`domain/application/infrastructure/presentation`)
- Google OAuth ผ่าน Supabase Auth
- หน้า Pending Access พร้อม Supabase User ID
- Shop membership แบบ `OWNER` / `STAFF` และ `ACTIVE` / `REVOKED`
- Owner UI และ RPC สำหรับเพิ่ม เปลี่ยนบทบาท และถอนสิทธิ์
- Platform Admin UI สำหรับอนุมัติหรือถอนสิทธิ์สร้างร้านด้วย Supabase User ID
- Shop onboarding ที่สร้างร้านและ OWNER membership แบบ atomic จาก grant
- RLS, explicit grants, indexes, constraints และ audit log
- Owner provisioning ที่ไม่เปิดให้ client เรียก
- pgTAP schema/privilege tests และ frontend component test ขั้นต้น
- Database migrations แยกตาม schema, identity helpers, membership commands และ RLS policies

ยังไม่มี Catalog, Order, Queue, Payment, Store Session, Report หรือ LINE implementation

## สมมติฐานชั่วคราว

- ระบบรองรับหลายร้านแบบ tenant แยกกัน แต่ร้านหนึ่งยังไม่มีหลายสาขา
- Timezone เริ่มต้นเป็น `Asia/Bangkok`
- Currency เริ่มต้นเป็น `THB`
- ร้านหนึ่งมี Owner ได้มากกว่าหนึ่งคน เพื่อให้เปลี่ยนผู้ดูแลได้โดยไม่เกิด lockout
- ผู้ใช้ที่ยังไม่มี membership ถือว่า Pending โดยไม่สร้างแถว `PENDING`
- Owner เพิ่มสมาชิกด้วย Supabase Auth User ID หลังผู้ใช้นั้น Login Google อย่างน้อยหนึ่งครั้ง

Timezone และ Currency ต้องยืนยันก่อน Phase ที่สร้าง Store Session และ Order

## เริ่มใช้งาน Local

1. ติดตั้ง Docker Desktop และ Supabase CLI
2. คัดลอก `.env.example` เป็น `.env`
3. ตั้งค่า Google OAuth Client ID/Secret ใน `.env`
4. รัน `npm run supabase:start`
5. นำ local publishable key ไปใส่ `VITE_SUPABASE_PUBLISHABLE_KEY`
6. รัน `npm run dev`

Google OAuth ต้องมี local callback URL:

`http://127.0.0.1:54321/auth/v1/callback`

## Provision Platform Admin คนแรก

Platform Admin ต้อง Login Google หนึ่งครั้งก่อน เพื่อให้มี `auth.users` และ `user_profiles`
จากนั้นผู้ดูแลระบบเรียกผ่าน Supabase SQL Editor หรือ direct database connection:

```sql
select app_private.provision_first_platform_admin(
  '<supabase-auth-user-uuid>'::uuid
);
```

ฟังก์ชันนี้:

- เรียกไม่ได้ผ่าน `anon` หรือ `authenticated`
- ใช้ได้เฉพาะตอนยังไม่มีร้าน
- สร้าง Platform Admin และ Audit Log ใน transaction เดียว
- ปฏิเสธผู้ใช้ที่ยังไม่เคย Login

## Security notes

- Frontend ใช้เฉพาะ publishable/anon key เท่านั้น
- Role ไม่ถูกอ่านจาก `user_metadata`
- RPC ทุกตัวตรวจ `auth.uid()` และ active OWNER membership ซ้ำในฐานข้อมูล
- Direct insert/update/delete บน `shop_members` ถูก revoke จาก client roles
- Database trigger ป้องกันการ revoke หรือลดสิทธิ์ Owner คนสุดท้าย
- Database trigger ป้องกันผู้ใช้ถอนสิทธิ์หรือลดบทบาทของ Account ตนเอง
- หนึ่ง Account มี membership ได้หลายร้านและ Owner เพิ่มสาขาได้หลังร้านแรกได้รับอนุมัติ
- RLS เปิดใช้งานกับทุกตารางใน `public`
- `SECURITY DEFINER` ทุกตัวกำหนด `search_path = ''` และใช้ชื่อ object แบบ schema-qualified

