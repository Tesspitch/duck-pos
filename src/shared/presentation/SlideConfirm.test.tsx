import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, vi, expect, test } from 'vitest'
import { SlideConfirm } from './SlideConfirm'
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

test('short drag cancels and a full drag confirms only on release', async () => {
  HTMLDialogElement.prototype.close = vi.fn()
  vi.stubGlobal('PointerEvent', MouseEvent)
  const confirm = vi.fn().mockResolvedValue(undefined)
  const { container } = render(<SlideConfirm label="เปิดร้าน" onConfirm={confirm} />)
  Object.defineProperty(container.querySelector('.slide-confirm'), 'clientWidth', { value: 252 })
  const handle = screen.getByRole('button', { name: 'ยืนยันเปิดร้าน' })
  handle.setPointerCapture = vi.fn()
  fireEvent.pointerDown(handle, { button: 0, clientX: 0 })
  fireEvent.pointerMove(handle, { clientX: 100 })
  fireEvent.pointerUp(handle)
  expect(confirm).not.toHaveBeenCalled()
  fireEvent.pointerDown(handle, { button: 0, clientX: 0 })
  fireEvent.pointerMove(handle, { clientX: 200 })
  expect(confirm).not.toHaveBeenCalled()
  fireEvent.pointerUp(handle)
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
})

test('ordinary tapping the handle never changes store state', () => {
  const confirm = vi.fn().mockResolvedValue(undefined)
  render(<SlideConfirm label="เปิดร้าน" onConfirm={confirm} />)
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันเปิดร้าน' }), { detail: 1 })
  expect(confirm).not.toHaveBeenCalled()
})

test('accessible alternative requires separate confirmation and runs once', async () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open') })
  let resolve!: () => void
  const confirm = vi.fn(() => new Promise<void>((done) => { resolve = done }))
  render(<SlideConfirm label="เปิดร้าน" onConfirm={confirm} />)
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันเปิดร้าน' }), { detail: 0 })
  expect(confirm).not.toHaveBeenCalled()
  const button = screen.getByRole('dialog').querySelectorAll('button')[1]!
  fireEvent.click(button)
  fireEvent.click(button)
  expect(confirm).toHaveBeenCalledTimes(1)
  resolve()
  await waitFor(() => expect(screen.getByRole('button', { name: 'ยืนยันเปิดร้าน' })).toBeEnabled())
})
