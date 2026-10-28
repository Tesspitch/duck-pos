import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { PendingAccessPage } from './PendingAccessPage'

vi.mock('../../../auth/application/auth-context', () => ({
  useAuth: () => ({
    user: { id: '11111111-1111-1111-1111-111111111111' },
    signOut: vi.fn(),
  }),
}))

vi.mock('../../application/use-memberships', () => ({
  useMemberships: () => ({ data: [] }),
}))

vi.mock('../../../platform-admin/application/use-platform-admin', () => ({
  usePlatformAdmin: () => ({ data: false }),
}))

vi.mock('../../../shop-onboarding/application/use-shop-creation-access', () => ({
  useShopCreationAccess: () => ({ data: null }),
}))

describe('PendingAccessPage', () => {
  it('shows the authenticated user id for owner approval', () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PendingAccessPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('รอเจ้าของร้านอนุมัติ')).toBeInTheDocument()
    expect(screen.getByText('11111111-1111-1111-1111-111111111111')).toBeInTheDocument()
  })
})

