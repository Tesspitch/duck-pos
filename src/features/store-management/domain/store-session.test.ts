import { describe, expect, it } from 'vitest'

import { canCloseStore } from './store-session'

describe('store close rule', () => {
  it('allows close only when an active session has no pending orders', () => {
    expect(canCloseStore({ id: '1', businessDate: '2026-10-28', openedAt: '', pendingOrderCount: 0 })).toBe(true)
    expect(canCloseStore({ id: '1', businessDate: '2026-10-28', openedAt: '', pendingOrderCount: 1 })).toBe(false)
    expect(canCloseStore(null)).toBe(false)
  })
})

