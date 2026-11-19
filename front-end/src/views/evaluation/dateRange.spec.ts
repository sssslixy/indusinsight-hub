import { describe, expect, it } from 'vitest'
import { readDateRange, recentDates } from './dateRange'

describe('evaluation date ranges', () => {
  it('accepts complete ISO calendar dates including leap days', () => {
    expect(readDateRange(undefined, undefined)).toEqual({ valid: true })
    expect(readDateRange('2024-02-29', '2024-03-01')).toEqual({
      valid: true,
      range: { startDate: '2024-02-29', endDate: '2024-03-01' },
    })
  })
  it.each([
    [undefined, '2026-10-31'],
    ['2026-10-01', undefined],
    ['', ''],
    ['2026-02-29', '2026-03-01'],
    ['2026-11-01', '2026-10-31'],
    ['2026-1-01', '2026-10-31'],
    [['2026-10-01'], '2026-10-31'],
    ['0000-01-01', '2026-10-31'],
  ])('rejects invalid pair %s / %s', (start, end) => {
    expect(readDateRange(start, end)).toEqual({ valid: false })
  })
  it('calculates inclusive shortcuts using Beijing calendar days across UTC midnight', () => {
    const now = new Date('2026-11-03T18:00:00Z')
    expect(recentDates(7, now)).toEqual(['2026-10-29', '2026-11-04'])
    expect(recentDates(365, now)).toEqual(['2025-11-05', '2026-11-04'])
    expect(recentDates(7, new Date('2026-01-01T00:00:00Z'))).toEqual(['2025-12-26', '2026-01-01'])
  })
})
