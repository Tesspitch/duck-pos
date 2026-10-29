import { describe, expect, it } from 'vitest'

import { csvCell, salesHistoryCsv, validateDateRange } from './sales-report'

describe('sales report rules', () => {
  it('rejects reversed and overlong ranges', () => {
    expect(validateDateRange('2026-10-29', '2026-10-28')).toBeTruthy()
    expect(validateDateRange('2025-01-01', '2026-01-02')).toBeTruthy()
    expect(validateDateRange('2026-10-01', '2026-10-29')).toBeNull()
  })

  it('escapes CSV cells safely', () => {
    expect(csvCell('เป็ด,"อร่อย"')).toBe('"เป็ด,""อร่อย"""')
  })

  it('creates a CSV with product snapshots', () => {
    const csv = salesHistoryCsv([{
      id: '1', businessDate: '2026-10-29', createdAt: '2026-10-29T01:00:00Z',
      storeSessionId: '2', queueNumber: 7, orderReference: 'REF-7', source: 'POS',
      orderStatus: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CASH',
      totalSatang: 10000, paidAmountSatang: 10000, paidAt: '2026-10-29T01:01:00Z',
      products: [{ name: 'เคบับ', quantity: 2 }],
    }])
    expect(csv).toContain('"REF-7"')
    expect(csv).toContain('"เคบับ x2"')
    expect(csv).toContain('"100.00"')
  })
})
