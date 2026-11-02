import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { QueueConnectionIndicator } from './QueueConnectionIndicator'

afterEach(cleanup)
test('connection dot exposes accessible states and maps to green/yellow/red', () => {
  const view = render(<QueueConnectionIndicator state="CONNECTED" />)
  expect(screen.getByRole('status', { name: 'เชื่อมต่อคิวแล้ว' }).firstElementChild).toHaveClass('connected')
  view.rerender(<QueueConnectionIndicator state="CONNECTING" />)
  expect(screen.getByRole('status', { name: 'กำลังเชื่อมต่อคิว' }).firstElementChild).toHaveClass('connecting')
  view.rerender(<QueueConnectionIndicator state="DISCONNECTED" />)
  expect(screen.getByRole('status', { name: 'การเชื่อมต่อคิวขัดข้อง' }).firstElementChild).toHaveClass('disconnected')
})
