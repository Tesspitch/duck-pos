# DuckPOS Architecture

## รูปแบบสถาปัตยกรรม

DuckPOS ใช้ **Modular Monolith + Pragmatic Clean Architecture**

ระบบยังคง deploy เป็น frontend เดียวและ Supabase project เดียว ไม่แยก Microservices แต่ภายในแต่ละ Business Module มี boundary ชัดเจน

```text
presentation ──> application ──> domain
                       ▲
                       │ implements ports
                infrastructure
```

### Dependency rules

- `domain` ห้าม import React, Supabase หรือ browser API
- `application` รู้จัก domain และประกาศ interface/port ที่ต้องใช้
- `infrastructure` implement port และเป็นที่เดียวที่เรียก Supabase หรือ external API
- `presentation` แสดงผลและรับ input โดยเรียก application hooks/use cases
- `app` เป็น Composition Root ประกอบ implementation จริงเข้ากับ interface
- `shared` ใช้เฉพาะสิ่งที่แชร์จริงระหว่างหลาย feature

## โครงสร้าง Phase 1–2

```text
src/
├── app/
│   ├── App.tsx                         # Route composition และ lazy loading
│   ├── pages/HomePage.tsx              # หน้าเริ่มต้นของ application shell
│   └── providers/AppProviders.tsx      # Composition Root และ dependency injection
├── features/
│   ├── auth/
│   │   ├── application/
│   │   │   ├── auth-gateway.ts         # Port สำหรับระบบยืนยันตัวตน
│   │   │   ├── auth-context.ts         # Auth state contract สำหรับ React
│   │   │   └── AuthProvider.tsx        # ประสาน session lifecycle
│   │   ├── infrastructure/
│   │   │   └── supabase-auth-gateway.ts # Supabase Auth adapter
│   │   └── presentation/
│   │       ├── components/AuthGate.tsx # Route authorization guard
│   │       └── pages/                   # Login และ OAuth callback
│   ├── access-control/
│       ├── domain/membership.ts         # Membership model และ role types
│       ├── application/
│       │   ├── membership-repository.ts # Repository port
│       │   ├── membership-repository-context.ts # Repository context contract
│       │   ├── MembershipRepositoryProvider.tsx # Inject repository implementation
│       │   ├── member-form-schema.ts    # Input validation
│       │   ├── use-memberships.ts       # Current-user membership query
│       │   └── use-access-management.ts # Owner membership use cases
│       ├── infrastructure/
│       │   └── supabase-membership-repository.ts # Supabase/RPC adapter
│       └── presentation/
│           ├── components/              # MemberForm และ MemberList
│           └── pages/                   # Access Management และ Pending Access
│   ├── platform-admin/                  # อนุมัติสิทธิ์สร้างร้านระดับระบบ
│   │   ├── domain/                       # Shop creation grant model
│   │   ├── application/                  # Admin repository port และ use cases
│   │   ├── infrastructure/               # Supabase admin/grant adapter
│   │   └── presentation/                 # Platform Admin page และ components
│   ├── shop-onboarding/                 # สร้างร้านจากสิทธิ์ที่ได้รับ
│       ├── domain/                       # Shop creation input/access model
│       ├── application/                  # Onboarding use cases
│       ├── infrastructure/               # Supabase onboarding adapter
│       └── presentation/                 # Create Shop page
│   ├── catalog/                         # Product Catalog module
│   ├── topping-management/              # Reusable topping library and category assignment
│   │   ├── domain/                       # Category/Product/Option และกฎราคา
│   │   ├── application/                  # Repository/Image ports, validation, query/mutations
│   │   ├── infrastructure/               # Supabase RPC/query/storage และ image optimizer
│   │   └── presentation/                 # Catalog page และฟอร์มเฉพาะหน้าที่
│   ├── profile/                          # Current account identity และ display name
│   │   ├── domain/                       # Profile model
│   │   ├── application/                  # Profile repository/use case/validation
│   │   ├── infrastructure/               # Supabase profile adapter
│   │   └── presentation/                 # Profile page
│   ├── shop-settings/                    # Shop branding ที่ Owner จัดการ
│   │   ├── domain/                       # Shop branding model
│   │   ├── application/                  # Settings/image ports และ orchestration
│   │   ├── infrastructure/               # Supabase RPC/storage และ logo optimizer
│   │   └── presentation/                 # Shop Settings page
│   ├── shop-context/                     # Active shop selection สำหรับหลายสาขา
│   │   └── application/                  # Context/provider และ local preference
│   ├── customer-ordering/                # Public QR menu, cart, checkout และ tracking
│   │   ├── domain/                       # Public menu/order/cart models
│   │   ├── application/                  # Repository/location ports, Zustand และ queries
│   │   ├── infrastructure/               # Supabase Edge/RPC และ Geolocation adapters
│   │   └── presentation/                 # Public menu, cart และ tracking pages
│   ├── staff-orders/                     # Staff POS, queue, payment และ realtime
│   │   ├── domain/                       # Order/payment/cart business models
│   │   ├── application/                  # Ports, use cases, cache และ cart state
│   │   ├── infrastructure/               # Supabase RPC และ Realtime adapters
│   │   └── presentation/                 # POS/Queue pages และ touch components
│   ├── store-management/                 # Owner store sessions และ history
│   │   ├── domain/                       # Session/history models และ close rules
│   │   ├── application/                  # Repository/realtime ports และ use cases
│   │   ├── infrastructure/               # Supabase RPC และ Realtime adapters
│   │   └── presentation/                 # Store control และ history UI
│   ├── sales-analytics/                  # Owner dashboard, sales history และ CSV
│       ├── domain/                       # Report models, range rules และ CSV serialization
│       ├── application/                  # Repository/export ports และ cached queries
│       ├── infrastructure/               # Aggregate RPC adapter และ browser CSV export
│       └── presentation/                 # Metrics, filters, breakdown และ paginated history
│   └── line-notifications/               # LINE subscription และ sales reports
│       ├── domain/                       # Subscription/settings/run models และ schedule rules
│       ├── application/                  # Owner management port และ cached mutations
│       ├── infrastructure/               # Supabase LINE management RPC adapter
│       └── presentation/                 # Settings, approval และ delivery history UI
├── lib/
│   ├── env.ts                           # ตรวจ environment variables
│   └── supabase.ts                      # สร้าง Supabase client เพียงจุดเดียว
└── shared/presentation/AppShell.tsx     # Layout ที่หลายหน้าร่วมกันใช้
```

## Database migrations

```text
supabase/migrations/
├── 202610280001_phase_1_schema.sql              # Types, tables, constraints, indexes
├── 202610280002_phase_1_identity_helpers.sql    # Auth sync, helper และ audit triggers
├── 202610280003_phase_1_membership_commands.sql # Membership RPC และ owner provisioning
├── 202610280004_phase_1_rls_policies.sql        # Grants, RLS และ policies
├── 202610280005_phase_1_platform_admin_and_shop_onboarding.sql # Platform admin/grants/onboarding
├── 202610280006_phase_2_catalog_schema.sql      # Catalog tables, constraints, indexes
├── 202610280007_phase_2_catalog_commands.sql    # Catalog RPC และ audit commands
├── 202610280008_phase_2_catalog_security_and_storage.sql # RLS, grants, Storage bucket/policies
├── 202610280009_profile_and_shop_branding.sql    # Profile RPC, shop logo, Storage policies
├── 202610280010_multi_shop_and_self_membership_protection.sql # Multi-shop และ membership guard
├── 202610280011_phase_3_ordering_schema.sql # Sessions, orders, queue และ tracking schema
├── 202610280012_phase_3_public_ordering_api.sql # Public menu, checkout, geofence, rate limit
├── 202610280013_phase_3_shop_location_command.sql # Owner location RPC
├── 202610280014_phase_4_staff_pos_queue.sql # POS, queue, payment และ realtime
├── 202610280015_phase_5_store_management.sql # Store sessions, history และ atomic close
├── 202610290016_phase_6_sales_analytics.sql # Aggregate dashboard และ paginated sales history
├── 202610290017_apply_toppings_to_category.sql # Atomic option-group merge ภายในหมวดหมู่
├── 202610290025_reusable_topping_library.sql # Shop-level topping templates, category mapping and product sync
├── 202610290018_phase_7_line_notifications.sql # LINE subscriptions, report jobs, retry และ logs
├── 202610290019_phase_7_enum_cast_fix.sql # Explicit enum casts discovered by hosted flow test
├── 202610290020_phase_7_event_driven_dispatch.sql # Event outbox และ conditional retry wake-up
└── 202610290021_phase_7_conditional_cron.sql # Lightweight due-work database cron
```

Migration แยกตาม concern แต่ละไฟล์ยังเป็น transaction ของตัวเองและเรียงลำดับ dependency ด้วย timestamp

## กติกาสำหรับ Phase ถัดไป

1. สร้าง feature folder ตาม Business Module ก่อน
2. วาง business types/rules ใน `domain`
3. ประกาศ use case และ external dependency interfaces ใน `application`
4. วาง Supabase query/RPC และ external API client ใน `infrastructure`
5. วาง React pages/components ใน `presentation`
6. ห้ามเรียก `supabase` จาก page/component
7. แยกไฟล์เมื่อมีมากกว่าหนึ่งเหตุผลที่ต้องแก้ไข แต่ไม่สร้าง interface ที่มี implementation เดียวหากไม่ได้เป็น boundary จริง

