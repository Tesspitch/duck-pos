import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { StaffProductCard } from './StaffProductCard'
import { usePosCartStore } from '../../application/pos-cart-store'
import type { Product } from '../../../catalog/domain/catalog'

const product: Product = { id: 'p', shopId: 's', categoryId: 'c', name: 'เคบับไก่', description: 'ไก่ย่าง ผักสด และซอสกระเทียม', basePriceSatang: 3900, imageUrl: '/menu.jpg', imagePath: 'menu.jpg', sortOrder: 0, isAvailable: true, isVisible: true, optionGroups: [{ id: 'g', shopId: 's', productId: 'p', name: 'ไซส์', selectionMode: 'SINGLE', isRequired: true, minSelect: 1, maxSelect: 1, pricingMode: 'PER_TOPPING', additionalSelectionPriceSatang: 0, sortOrder: 0, isVisible: true, options: [{ id: 'm', shopId: 's', optionGroupId: 'g', name: 'M', priceDeltaSatang: 1000, sortOrder: 0, isAvailable: true, isVisible: true }] }] }
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }; window.scrollTo = vi.fn() })
afterEach(() => { cleanup(); usePosCartStore.getState().clear() })
test('POS shows description, opens full details, requires an option and prices quantity before adding', () => {
  render(<StaffProductCard product={product} />)
  expect(screen.getByText(product.description)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: /เคบับไก่/ }))
  expect(screen.getByRole('img', { name: 'เคบับไก่' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'เพิ่ม · ฿39.00' })).toBeDisabled()
  fireEvent.click(screen.getByRole('radio', { name: /M/ }))
  fireEvent.change(screen.getByLabelText('จำนวน'), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'เพิ่ม · ฿98.00' }))
  expect(usePosCartStore.getState().lines[0]).toMatchObject({ productName: 'เคบับไก่', quantity: 2, options: [{ name: 'M', priceDeltaSatang: 1000 }] })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
test('unavailable menu cannot be added', () => {
  render(<StaffProductCard product={{ ...product, isAvailable: false }} />)
  expect(screen.getByRole('button', { name: /เคบับไก่/ })).toBeDisabled()
  expect(screen.getByText('สินค้าหมด')).toBeVisible()
})
