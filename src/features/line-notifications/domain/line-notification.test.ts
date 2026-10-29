import { describe, expect, it } from 'vitest'

import { normalizeReportTimes } from './line-notification'

describe('normalizeReportTimes', () => {
  it('sorts, deduplicates and removes invalid times', () => {
    expect(normalizeReportTimes(['18:00', '09:30', '18:00', '25:00', '9:30'])).toEqual(['09:30', '18:00'])
  })

  it('limits periodic schedules to six times', () => {
    expect(normalizeReportTimes(['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'])).toHaveLength(6)
  })
})

