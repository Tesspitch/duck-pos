import { describe, expect, it } from 'vitest'

import { bahtTextToSatang, satangToBahtText } from './money'

describe('catalog money conversion', () => {
  it.each([
    ['0', 0],
    ['45', 4500],
    ['45.5', 4550],
    ['45.05', 4505],
  ])('converts %s baht to integer satang', (input, expected) => {
    expect(bahtTextToSatang(input)).toBe(expected)
  })

  it('rejects prices with more than two decimal places', () => {
    expect(() => bahtTextToSatang('10.999')).toThrow()
  })

  it('formats integer satang for editing without floating point drift', () => {
    expect(satangToBahtText(4505)).toBe('45.05')
  })
})
