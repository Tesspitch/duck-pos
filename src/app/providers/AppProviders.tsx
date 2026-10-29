import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider gateway={supabaseAuthGateway}>
        <PlatformAdminRepositoryProvider repository={supabasePlatformAdminRepository}>
          <ShopOnboardingRepositoryProvider repository={supabaseShopOnboardingRepository}>
            <MembershipRepositoryProvider repository={supabaseMembershipRepository}>
              <ActiveShopProvider>
                <CatalogServicesProvider
                  repository={supabaseCatalogRepository}
                  imageService={supabaseCatalogImageService}
                >
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
                                    <BrowserRouter>{children}</BrowserRouter>
                                  </QrCodeServiceProvider>
                                </LineNotificationProvider>
                              </SalesAnalyticsProvider>
                            </StoreManagementProvider>
                          </StaffOrdersProvider>
                        </CustomerLocationServiceProvider>
                      </CustomerOrderingRepositoryProvider>
                    </ShopSettingsProvider>
                  </ProfileRepositoryProvider>
                </CatalogServicesProvider>
              </ActiveShopProvider>
            </MembershipRepositoryProvider>
          </ShopOnboardingRepositoryProvider>
        </PlatformAdminRepositoryProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

