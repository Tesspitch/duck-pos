import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { PosPage } from './PosPage'
import { usePosCartStore } from '../../application/pos-cart-store'

vi.mock('../../../../shared/presentation/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../../shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: { shop_id: 'shop', shops: { name: 'QA' } } }) }))
vi.mock('../../../catalog/application/use-catalog', () => ({ useCatalog: () => ({ data: [
  { id: 'kebab', name: 'เคบับ', isVisible: true, products: [{ id: 'chicken', name: 'ไก่', isVisible: true }] },
  { id: 'rice', name: 'ข้าว', isVisible: true, products: [{ id: 'rice-dish', name: 'ข้าวไก่', isVisible: true }] },
] }) }))
vi.mock('../../application/use-staff-orders', () => ({ useStaffOrders: () => ({ data: { isOpen: true } }) }))
vi.mock('../../application/use-staff-order-actions', () => ({ useCreatePosOrder: () => ({ isPending: false }) }))
vi.mock('../components/StaffProductCard', () => ({ StaffProductCard: ({ product }: { product: { name: string } }) => <button>{product.name}</button> }))
afterEach(() => { cleanup(); usePosCartStore.getState().clear() })

test('POS defaults to all categories and can return to all after selecting one category', () => {
  render(<MemoryRouter><PosPage /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'ทั้งหมด' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'ไก่' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'ข้าวไก่' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'เคบับ' }))
  expect(screen.queryByRole('button', { name: 'ข้าวไก่' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'ทั้งหมด' }))
  expect(screen.getByRole('button', { name: 'ข้าวไก่' })).toBeVisible()
})
