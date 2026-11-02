import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { QuantityStepper } from './QuantityStepper'

afterEach(cleanup)
function Harness() { const [value, setValue] = useState(1); return <QuantityStepper value={value} onChange={setValue} /> }
test('large buttons change quantity and preserve the minimum and maximum', () => {
  render(<Harness />)
  expect(screen.getByRole('button', { name: 'ลดจำนวน' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'เพิ่มจำนวน' }))
  expect(screen.getByLabelText('จำนวน')).toHaveValue(2)
  fireEvent.click(screen.getByRole('button', { name: 'ลดจำนวน' }))
  expect(screen.getByLabelText('จำนวน')).toHaveValue(1)
  fireEvent.change(screen.getByLabelText('จำนวน'), { target: { value: '999' } })
  expect(screen.getByLabelText('จำนวน')).toHaveValue(20)
  expect(screen.getByRole('button', { name: 'เพิ่มจำนวน' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('จำนวน'), { target: { value: '-5' } })
  expect(screen.getByLabelText('จำนวน')).toHaveValue(1)
})
test('pending state prevents quantity edits', () => {
  const change = vi.fn()
  render(<QuantityStepper value={2} disabled onChange={change} />)
  expect(screen.getByLabelText('จำนวน')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'เพิ่มจำนวน' }))
  expect(change).not.toHaveBeenCalled()
})
