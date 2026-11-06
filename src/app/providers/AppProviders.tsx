import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCustomerTrackingSync } from '../../features/customer-ordering/application/use-customer-tracking-sync'
import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ConnectionStatus } from '../../shared/presentation/ConnectionStatus'
import { AppUpdateNotice } from '../../shared/presentation/AppUpdateNotice'
import { MutationFeedback } from '../../shared/presentation/MutationFeedback'
import { HistoryDeletionContext } from '../../features/history-management/application/history-deletion-context'
import { supabaseHistoryDeletionRepository } from '../../features/history-management/infrastructure/supabase-history-deletion-repository'
import { AppErrorBoundary } from '../../shared/presentation/AppErrorBoundary'
import { DiningContextProvider } from '../../features/dining/application/dining-context'
import { supabaseDiningRepository } from '../../features/dining/infrastructure/supabase-dining-repository'
import { AttendanceContext, AttendanceLocationContext } from '../../features/attendance/application/attendance-context'
import { browserAttendanceLocation } from '../../features/attendance/infrastructure/browser-attendance-location'
import { supabaseAttendanceRepository } from '../../features/attendance/infrastructure/supabase-attendance-repository'

import { MembershipRepositoryProvider } from '../../features/access-control/application/MembershipRepositoryProvider'
import { supabaseMembershipRepository } from '../../features/access-control/infrastructure/supabase-membership-repository'
import { AuthProvider } from '../../features/auth/application/AuthProvider'
import { supabaseAuthGateway } from '../../features/auth/infrastructure/supabase-auth-gateway'
import { CatalogServicesProvider } from '../../features/catalog/application/CatalogServicesProvider'
import { supabaseCatalogImageService } from '../../features/catalog/infrastructure/supabase-catalog-image-service'
import { supabaseCatalogRepository } from '../../features/catalog/infrastructure/supabase-catalog-repository'
import { CustomerLocationServiceProvider } from '../../features/customer-ordering/application/CustomerLocationServiceProvider'
import { CustomerOrderingRepositoryProvider } from '../../features/customer-ordering/application/CustomerOrderingRepositoryProvider'
import { browserCustomerLocationService } from '../../features/customer-ordering/infrastructure/browser-customer-location-service'
import { supabaseCustomerOrderingRepository } from '../../features/customer-ordering/infrastructure/supabase-customer-ordering-repository'
import { LineNotificationProvider } from '../../features/line-notifications/application/LineNotificationProvider'
import { supabaseLineNotificationRepository } from '../../features/line-notifications/infrastructure/supabase-line-notification-repository'
import { PlatformAdminRepositoryProvider } from '../../features/platform-admin/application/PlatformAdminRepositoryProvider'
import { supabasePlatformAdminRepository } from '../../features/platform-admin/infrastructure/supabase-platform-admin-repository'
import { ProfileRepositoryProvider } from '../../features/profile/application/ProfileRepositoryProvider'
import { supabaseProfileRepository } from '../../features/profile/infrastructure/supabase-profile-repository'
import { SalesAnalyticsProvider } from '../../features/sales-analytics/application/SalesAnalyticsProvider'
import { browserSalesCsvExporter } from '../../features/sales-analytics/infrastructure/browser-sales-csv-exporter'
import { supabaseSalesAnalyticsRepository } from '../../features/sales-analytics/infrastructure/supabase-sales-analytics-repository'
import { QrCodeServiceProvider } from '../../features/shop-qr/application/QrCodeServiceProvider'
import { browserQrCodeService } from '../../features/shop-qr/infrastructure/browser-qr-code-service'
import { ShopSettingsProvider } from '../../features/shop-settings/application/ShopSettingsProvider'
import { supabaseShopLogoService } from '../../features/shop-settings/infrastructure/supabase-shop-logo-service'
import { browserShopLocationCaptureService } from '../../features/shop-settings/infrastructure/browser-shop-location-capture-service'
import { supabaseShopSettingsRepository } from '../../features/shop-settings/infrastructure/supabase-shop-settings-repository'
import { ActiveShopProvider } from '../../features/shop-context/application/ActiveShopProvider'
import { ShopOnboardingRepositoryProvider } from '../../features/shop-onboarding/application/ShopOnboardingRepositoryProvider'
import { supabaseShopOnboardingRepository } from '../../features/shop-onboarding/infrastructure/supabase-shop-onboarding-repository'
import { StaffOrdersProvider } from '../../features/staff-orders/application/StaffOrdersProvider'
import { supabaseStaffOrdersRealtime } from '../../features/staff-orders/infrastructure/supabase-staff-orders-realtime'
import { supabaseStaffOrdersRepository } from '../../features/staff-orders/infrastructure/supabase-staff-orders-repository'
import { StoreManagementProvider } from '../../features/store-management/application/StoreManagementProvider'
import { supabaseStoreManagementRealtime } from '../../features/store-management/infrastructure/supabase-store-management-realtime'
import { supabaseStoreManagementRepository } from '../../features/store-management/infrastructure/supabase-store-management-repository'
import { ToppingLibraryProvider } from '../../features/topping-management/application/ToppingLibraryProvider'
import { supabaseToppingLibraryRepository } from '../../features/topping-management/infrastructure/supabase-topping-library-repository'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  useCustomerTrackingSync()
  return (
    <QueryClientProvider client={queryClient}>
      <AppUpdateNotice/>
      <HistoryDeletionContext value={supabaseHistoryDeletionRepository}>
      <DiningContextProvider value={supabaseDiningRepository}>
      <AttendanceContext value={supabaseAttendanceRepository}>
      <AttendanceLocationContext value={browserAttendanceLocation}>
      <MutationFeedback />
      <AuthProvider gateway={supabaseAuthGateway}>
        <PlatformAdminRepositoryProvider repository={supabasePlatformAdminRepository}>
          <ShopOnboardingRepositoryProvider repository={supabaseShopOnboardingRepository}>
            <MembershipRepositoryProvider repository={supabaseMembershipRepository}>
              <ActiveShopProvider>
                <CatalogServicesProvider
                  repository={supabaseCatalogRepository}
                  imageService={supabaseCatalogImageService}
                >
                  <ToppingLibraryProvider repository={supabaseToppingLibraryRepository}>
                  <ProfileRepositoryProvider repository={supabaseProfileRepository}>
                    <ShopSettingsProvider
                      repository={supabaseShopSettingsRepository}
                      logoService={supabaseShopLogoService}
                      locationCaptureService={browserShopLocationCaptureService}
                    >
                      <CustomerOrderingRepositoryProvider repository={supabaseCustomerOrderingRepository}>
                        <CustomerLocationServiceProvider service={browserCustomerLocationService}>
                          <StaffOrdersProvider repository={supabaseStaffOrdersRepository} realtime={supabaseStaffOrdersRealtime}>
                            <StoreManagementProvider repository={supabaseStoreManagementRepository} realtime={supabaseStoreManagementRealtime}>
                              <SalesAnalyticsProvider repository={supabaseSalesAnalyticsRepository} csvExporter={browserSalesCsvExporter}>
                                <LineNotificationProvider repository={supabaseLineNotificationRepository}>
                                  <QrCodeServiceProvider service={browserQrCodeService}>
                                    <BrowserRouter><AppErrorBoundary><ConnectionStatus />{children}</AppErrorBoundary></BrowserRouter>
                                  </QrCodeServiceProvider>
                                </LineNotificationProvider>
                              </SalesAnalyticsProvider>
                            </StoreManagementProvider>
                          </StaffOrdersProvider>
                        </CustomerLocationServiceProvider>
                      </CustomerOrderingRepositoryProvider>
                    </ShopSettingsProvider>
                  </ProfileRepositoryProvider>
                  </ToppingLibraryProvider>
                </CatalogServicesProvider>
              </ActiveShopProvider>
            </MembershipRepositoryProvider>
          </ShopOnboardingRepositoryProvider>
        </PlatformAdminRepositoryProvider>
      </AuthProvider>
      </AttendanceLocationContext>
      </AttendanceContext>
      </DiningContextProvider>
      </HistoryDeletionContext>
    </QueryClientProvider>
  )
}

