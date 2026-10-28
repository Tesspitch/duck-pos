import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthGate } from '../features/auth/presentation/components/AuthGate'

const AccessManagementPage = lazy(() =>
  import('../features/access-control/presentation/pages/AccessManagementPage').then((module) => ({
    default: module.AccessManagementPage,
  })),
)
const AuthCallbackPage = lazy(() =>
  import('../features/auth/presentation/pages/AuthCallbackPage').then((module) => ({
    default: module.AuthCallbackPage,
  })),
)
const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
)
const LoginPage = lazy(() =>
  import('../features/auth/presentation/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const PendingAccessPage = lazy(() =>
  import('../features/access-control/presentation/pages/PendingAccessPage').then((module) => ({
    default: module.PendingAccessPage,
  })),
)
const PlatformAdminPage = lazy(() =>
  import('../features/platform-admin/presentation/pages/PlatformAdminPage').then((module) => ({
    default: module.PlatformAdminPage,
  })),
)
const CreateShopPage = lazy(() =>
  import('../features/shop-onboarding/presentation/pages/CreateShopPage').then((module) => ({
    default: module.CreateShopPage,
  })),
)
const CatalogPage = lazy(() =>
  import('../features/catalog/presentation/pages/CatalogPage').then((module) => ({
    default: module.CatalogPage,
  })),
)
const ProfilePage = lazy(() =>
  import('../features/profile/presentation/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)
const ShopSettingsPage = lazy(() =>
  import('../features/shop-settings/presentation/pages/ShopSettingsPage').then((module) => ({
    default: module.ShopSettingsPage,
  })),
)

export function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/pending"
          element={
            <AuthGate requireMembership={false}>
              <PendingAccessPage />
            </AuthGate>
          }
        />
        <Route
          path="/access"
          element={
            <AuthGate requireOwner>
              <AccessManagementPage />
            </AuthGate>
          }
        />
        <Route
          path="/admin"
          element={
            <AuthGate requireMembership={false} requirePlatformAdmin>
              <PlatformAdminPage />
            </AuthGate>
          }
        />
        <Route
          path="/create-shop"
          element={
            <AuthGate requireMembership={false} requireShopCreationOrOwner>
              <CreateShopPage />
            </AuthGate>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGate requireMembership={false}>
              <ProfilePage />
            </AuthGate>
          }
        />
        <Route
          path="/settings/shop"
          element={
            <AuthGate requireOwner>
              <ShopSettingsPage />
            </AuthGate>
          }
        />
        <Route
          path="/catalog"
          element={
            <AuthGate>
              <CatalogPage />
            </AuthGate>
          }
        />
        <Route
          path="/"
          element={
            <AuthGate>
              <HomePage />
            </AuthGate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function RouteLoading() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <p className="font-semibold">กำลังโหลด…</p>
    </main>
  )
}

