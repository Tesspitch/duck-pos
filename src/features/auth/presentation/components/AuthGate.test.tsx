import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { AuthGate } from './AuthGate'

const state = vi.hoisted(() => ({ role: null as 'OWNER' | 'STAFF' | null }))
vi.mock('../../application/auth-context', () => ({ useAuth: () => ({ loading: false, user: { id: 'u' } }) }))
vi.mock('../../../access-control/application/use-memberships', () => ({ useMemberships: () => ({ data: [{ shop_id: 's', role: 'OWNER' }], isLoading: false }) }))
vi.mock('../../../platform-admin/application/use-platform-admin', () => ({ usePlatformAdmin: () => ({ data: false, isLoading: false }) }))
vi.mock('../../../shop-onboarding/application/use-shop-creation-access', () => ({ useShopCreationAccess: () => ({ data: null, isLoading: false }) }))
vi.mock('../../../shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: state.role ? { shop_id: 's', role: state.role } : null }) }))
afterEach(() => { cleanup(); state.role = null })

function OwnerRoute() {
  return <MemoryRouter initialEntries={['/owner']}><Routes><Route path="/owner" element={<AuthGate requireOwner><p>จัดการร้าน</p></AuthGate>} /><Route path="/" element={<p>หน้าหลัก</p>} /></Routes></MemoryRouter>
}

test('direct owner link waits for active-shop hydration before evaluating ownership', () => {
  const view = render(<OwnerRoute />)
  expect(screen.getByText('กำลังตรวจสอบสิทธิ์…')).toBeVisible()
  expect(screen.queryByText('หน้าหลัก')).not.toBeInTheDocument()
  state.role = 'OWNER'
  view.rerender(<OwnerRoute />)
  expect(screen.getByText('จัดการร้าน')).toBeVisible()
})

test('staff still cannot enter an owner-only page', () => {
  state.role = 'STAFF'
  render(<OwnerRoute />)
  expect(screen.getByText('หน้าหลัก')).toBeVisible()
  expect(screen.queryByText('จัดการร้าน')).not.toBeInTheDocument()
})
