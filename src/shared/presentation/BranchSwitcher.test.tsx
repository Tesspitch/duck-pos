import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
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
  function CurrentPage() { return <p>{useLocation().pathname==='/'?'ภาพรวมร้าน':'หน้าออเดอร์'}</p> }
  const onSwitch=vi.fn()
  render(<MemoryRouter initialEntries={['/queue']}><BranchSwitcher onSwitch={onSwitch}/><CurrentPage/></MemoryRouter>)
  const picker = screen.getByRole('button', { name: /เปลี่ยนสาขา/ })
  fireEvent.click(picker)
  expect(screen.getByRole('dialog', { name: 'เลือกสาขา' })).toBeVisible()
  expect(screen.getByText('กำลังใช้งาน').closest('[aria-current]')).toHaveTextContent('สาขา A')
  fireEvent.click(screen.getByRole('button', { name: 'สาขา B' }))
  expect(selectShop).not.toHaveBeenCalled()
  expect(screen.getByText('หน้าออเดอร์')).toBeVisible()
  expect(screen.getByRole('dialog', { name: 'ยืนยันเปลี่ยนสาขา' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'อยู่สาขาเดิม' }))
  expect(selectShop).not.toHaveBeenCalled()
  expect(picker).toHaveTextContent('สาขา A')
  fireEvent.click(picker)
  fireEvent.click(screen.getByRole('button', { name: 'สาขา B' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันเปลี่ยน' }))
  expect(selectShop).toHaveBeenCalledExactlyOnceWith('b')
  expect(onSwitch).toHaveBeenCalledOnce()
  expect(screen.getByText('ภาพรวมร้าน')).toBeVisible()
})
