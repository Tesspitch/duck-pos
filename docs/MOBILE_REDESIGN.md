# DuckPOS mobile redesign

- The mobile workspace exposes Overview, Orders, Add Order and More. More uses the existing membership-aware store navigation. Desktop retains the sidebar, and tablet retains the toolbar menu.
- `/queue` shows actionable order cards with status and payment controls. Legacy kitchen links redirect to `/queue`. `/queue?view=history` reads shop-scoped orders through existing Supabase RLS and filters by business date.
- Customers review their cart before confirming. Checkout still invokes the same location service and server validation for takeaway orders. Table orders use the existing table checkout flow. Tracking displays the status timeline from the current order status.
- Shared colors, surfaces, controls and focus styling apply to existing management screens. Catalog category filters, product image controls, report metrics and the responsive sales history received additional layout changes.
- Browser verification used isolated fixtures for cart and location denial, kitchen cards and navigation, and sales metrics at 320, 390, 768 and 1024 pixels. Production login, printing and real payments were outside this browser check.

## Changed files
- `src/features/catalog/presentation/components/CatalogList.tsx`
- `src/features/catalog/presentation/components/ProductForm.tsx`
- `src/features/customer-ordering/presentation/components/CustomerCart.test.tsx`
- `src/features/customer-ordering/presentation/components/CustomerCart.tsx`
- `src/features/customer-ordering/presentation/pages/OrderTrackingPage.tsx`
- `src/features/dining/presentation/StaffServiceRequests.tsx`
- `src/features/dining/presentation/TableServiceButton.tsx`
- `src/features/sales-analytics/presentation/components/SalesFilterPanel.tsx`
- `src/features/sales-analytics/presentation/components/SalesHistoryTable.tsx`
- `src/features/sales-analytics/presentation/components/SalesMetrics.tsx`
- `src/features/shop-qr/presentation/pages/ShopQrPage.test.tsx`
- `src/features/staff-orders/presentation/components/QueueConnectionIndicator.tsx`
- `src/features/staff-orders/presentation/pages/QueuePage.test.tsx`
- `src/features/staff-orders/presentation/pages/QueuePage.tsx`
- `src/features/staff-orders/presentation/pages/TableQueueFlow.test.tsx`
- `src/shared/presentation/AppShell.test.tsx`
- `src/shared/presentation/AppShell.tsx`
- `src/shared/presentation/MobileNavigation.tsx`
- `src/shared/presentation/StoreNavigation.tsx`
- `src/styles.css`
- `docs/MOBILE_REDESIGN.md`
- `src/features/staff-orders/presentation/pages/OrderHistory.tsx`
