import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { BranchSwitcher } from './BranchSwitcher'

const { selectShop } = vi.hoisted(() => ({ selectShop: vi.fn() }))
vi.mock('../../features/shop-context/application/active-shop-context', () => ({
  useActiveShop: () => ({
    activeMembership: { shop_id: 'a', shops: { name: 'สาขา A' } },
    memberships: [{ shop_id: 'a', shops: { name: 'สาขา A' } }, { shop_id: 'b', shops: { name: 'สาขา B' } }],
    selectShop,
  }),
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

test('branch selection waits for confirmation and cancel keeps the current shop', () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open') })
  render(<BranchSwitcher />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
  expect(selectShop).not.toHaveBeenCalled()
  expect(screen.getByRole('combobox')).toHaveValue('a')
  fireEvent.click(screen.getByRole('button', { name: 'อยู่สาขาเดิม' }))
  expect(selectShop).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันเปลี่ยน' }))
  expect(selectShop).toHaveBeenCalledExactlyOnceWith('b')
})
