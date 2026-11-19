import type { EvaluationDateRange } from '@/api/evaluation'

function isDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ||
    value.startsWith('0000')
  )
    return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function readDateRange(
  start: unknown,
  end: unknown,
): { valid: boolean; range?: EvaluationDateRange } {
  if (start === undefined && end === undefined) return { valid: true }
  if (!isDate(start) || !isDate(end) || start > end) return { valid: false }
  return { valid: true, range: { startDate: start, endDate: end } }
}

/** Date-only arithmetic; the browser's timezone must not decide what "today" means. */
export function recentDates(days: number, now = new Date()): [string, string] {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((value) => value.type === type)!.value
  const end = `${part('year')}-${part('month')}-${part('day')}`
  const start = new Date(`${end}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return [start.toISOString().slice(0, 10), end]
}
