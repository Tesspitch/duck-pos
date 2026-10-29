import { describe, expect, it } from 'vitest'

import { nextSortOrder } from './sort-order'

describe('nextSortOrder', () => {
  it('starts an empty collection at zero', () => {
    expect(nextSortOrder([])).toBe(0)
  })

  it('appends after the highest existing order', () => {
    expect(nextSortOrder([{ sortOrder: 4 }, { sortOrder: 1 }, { sortOrder: 9 }])).toBe(10)
  })
})
