// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlatformVisitTracker } from './platformVisitTracker'

let context = { token: 'account-a' as string | null, eligible: true }
let tracker: ReturnType<typeof createPlatformVisitTracker>
const report = vi.fn<(token: string, signal: AbortSignal) => Promise<void>>()
beforeEach(() => {
  vi.useFakeTimers()
  context = { token: 'account-a', eligible: true }
  report.mockReset().mockResolvedValue()
  tracker = createPlatformVisitTracker({ getContext: () => context, report })
})
afterEach(() => { tracker.dispose(); vi.useRealTimers() })

describe('platform page views', () => {
  it('sends every visit independently even while earlier requests are pending', async () => {
    report.mockImplementation(() => new Promise(() => {}))
    const visits = Array.from({ length: 12 }, () => tracker.pageView())
    await Promise.resolve()
    expect(report).toHaveBeenCalledTimes(12)
    expect(new Set(report.mock.calls.map(call => call[1])).size).toBe(12)
    await vi.advanceTimersByTimeAsync(5_000)
    await Promise.all(visits)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(report).toHaveBeenCalledTimes(12)
  })

  it('excludes anonymous and public pages without cancelling earlier valid visits', async () => {
    report.mockImplementation(() => new Promise(() => {}))
    const validVisit = tracker.pageView()
    await Promise.resolve()
    context.eligible = false; await tracker.pageView()
    context.eligible = true; context.token = null; await tracker.pageView()
    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0]![1].aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(5_000)
    await validVisit
  })

  it('captures each account before dispatch and does not cancel on account changes', async () => {
    report.mockImplementation(() => new Promise(() => {}))
    const first = tracker.pageView()
    context.token = 'account-b'
    const second = tracker.pageView()
    context.token = null
    await Promise.resolve()
    expect(report.mock.calls.map(call => call[0])).toEqual(['account-a', 'account-b'])
    expect(report.mock.calls.every(call => !call[1].aborted)).toBe(true)
    await vi.advanceTimersByTimeAsync(5_000)
    await Promise.all([first, second])
  })

  it('waits for all existing requests but does not extend the wait for later visits', async () => {
    const finishes: (() => void)[] = []
    report.mockImplementation(() => new Promise(resolve => { finishes.push(resolve) }))
    void tracker.pageView(); void tracker.pageView()
    let completed = false
    const snapshot = tracker.pending().then(() => { completed = true })
    const later = tracker.pageView()
    await Promise.resolve()
    finishes[0]!()
    await vi.advanceTimersByTimeAsync(0)
    expect(completed).toBe(false)
    finishes[1]!()
    await snapshot
    expect(completed).toBe(true)
    expect(report.mock.calls[2]![1].aborted).toBe(false)
    finishes[2]!()
    await later
    await tracker.pending()
  })

  it('bounds each request at five seconds and never retries failed or timed-out visits', async () => {
    report.mockImplementationOnce(() => new Promise(() => {}))
    const visit = tracker.pageView()
    const pending = tracker.pending()
    await vi.advanceTimersByTimeAsync(5_000)
    await Promise.all([visit, pending])
    expect(report.mock.calls[0]![1].aborted).toBe(true)
    report.mockRejectedValueOnce(new Error('offline'))
    await expect(tracker.pageView()).resolves.toBeUndefined()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(report).toHaveBeenCalledTimes(2)
    await tracker.pageView()
    expect(report).toHaveBeenCalledTimes(3)
  })

  it('disposes every pending request and prevents further reports', async () => {
    report.mockImplementation(() => new Promise(() => {}))
    void tracker.pageView(); void tracker.pageView()
    const pending = tracker.pending()
    await Promise.resolve()
    tracker.dispose()
    await pending
    expect(report.mock.calls.every(call => call[1].aborted)).toBe(true)
    await tracker.pageView()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(report).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
