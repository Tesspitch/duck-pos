import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ToppingGroupCard } from './ToppingGroupCard'
import type { ToppingGroup } from '../../domain/topping-library'

const group: ToppingGroup = { id: 'g', name: 'ซอส', minSelect: 0, maxSelect: 3, sortOrder: 0, isVisible: true, selectionMode: 'MULTIPLE', isRequired: false, pricingMode: 'PER_TOPPING', additionalSelectionPriceSatang: 0, categoryIds: [], toppings: [{ id: 't', groupId: 'g', name: 'ซอสกระเทียม', priceDeltaSatang: 1000, sortOrder: 0, isVisible: true, isAvailable: true }] }
afterEach(cleanup)
function setup(isOwner = true, busy = false) {
  const edit = vi.fn(), remove = vi.fn(), removeTopping = vi.fn(), toggle = vi.fn()
  render(<ToppingGroupCard shopId="s" group={group} categories={[]} isOwner={isOwner} busy={busy} onEditGroup={edit} onDeleteGroup={remove} onSaveTopping={vi.fn()} onDeleteTopping={removeTopping} onToggleAvailability={toggle} />)
  return { edit, remove, removeTopping, toggle }
}
test('edit and delete stay inside the upper-right overflow menus', () => {
  const { edit, removeTopping } = setup()
  expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'ลบ' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'ตัวเลือก หมวดท็อปปิง ซอส' }))
  fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
  expect(edit).toHaveBeenCalledWith(group)
  fireEvent.click(screen.getByRole('button', { name: 'ตัวเลือก ท็อปปิง ซอสกระเทียม' }))
  fireEvent.click(screen.getByRole('button', { name: 'ลบ' }))
  expect(removeTopping).toHaveBeenCalledWith(group.toppings[0])
})
test('staff can toggle availability without receiving owner edit/delete controls', () => {
  const { toggle } = setup(false)
  expect(screen.queryByRole('button', { name: /ตัวเลือก/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'ปิดขายท็อปปิง ซอสกระเทียม' }))
  expect(toggle).toHaveBeenCalledWith(group.toppings[0])
})
test('pending action locks overflow and availability controls', () => {
  setup(true, true)
  for (const button of screen.getAllByRole('button').filter((button) => !button.textContent?.includes('เพิ่ม'))) expect(button).toBeDisabled()
})
