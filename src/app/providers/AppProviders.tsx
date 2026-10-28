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
import { PlatformAdminRepositoryProvider } from '../../features/platform-admin/application/PlatformAdminRepositoryProvider'
import { supabasePlatformAdminRepository } from '../../features/platform-admin/infrastructure/supabase-platform-admin-repository'
import { ProfileRepositoryProvider } from '../../features/profile/application/ProfileRepositoryProvider'
import { supabaseProfileRepository } from '../../features/profile/infrastructure/supabase-profile-repository'
import { ShopSettingsProvider } from '../../features/shop-settings/application/ShopSettingsProvider'
import { supabaseShopLogoService } from '../../features/shop-settings/infrastructure/supabase-shop-logo-service'
import { supabaseShopSettingsRepository } from '../../features/shop-settings/infrastructure/supabase-shop-settings-repository'
import { ActiveShopProvider } from '../../features/shop-context/application/ActiveShopProvider'
import { ShopOnboardingRepositoryProvider } from '../../features/shop-onboarding/application/ShopOnboardingRepositoryProvider'
import { supabaseShopOnboardingRepository } from '../../features/shop-onboarding/infrastructure/supabase-shop-onboarding-repository'

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
                    >
                      <BrowserRouter>{children}</BrowserRouter>
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

