export const VISIT_REPORT_TIMEOUT_MS = 5_000

type Context = { token: string | null; eligible: boolean }
type Options = {
  getContext: () => Context
  report: (token: string, signal: AbortSignal) => Promise<void>
}

/** Each page view owns its request; no throttling, coalescing, or automatic retries. */
export function createPlatformVisitTracker({ getContext, report }: Options) {
  const flights = new Set<{ controller: AbortController; promise: Promise<void> }>()
  let disposed = false

  function pageView(): Promise<void> {
    if (disposed) return Promise.resolve()
    const { token, eligible } = getContext()
    if (!token || !eligible) return Promise.resolve()
    const capturedToken = token
    const controller = new AbortController()
    // Race with abort as well as passing a signal, so waits remain bounded even if a
    // transport does not promptly settle after abort. Late results are never used.
    const aborted = new Promise<void>(resolve => {
      controller.signal.addEventListener('abort', () => resolve(), { once: true })
    })
    const timeout = setTimeout(() => controller.abort(), VISIT_REPORT_TIMEOUT_MS)
    const current = { controller, promise: Promise.resolve() }
    flights.add(current)
    current.promise = Promise.race([
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) return report(capturedToken, controller.signal)
      }), aborted,
    ]).catch(() => { /* Best effort; a lost response must not cause a duplicate increment. */ }).finally(() => {
      clearTimeout(timeout)
      flights.delete(current)
    })
    return current.promise
  }

  return {
    pageView,
    // Snapshot the requests already issued; later navigation cannot extend this wait.
    pending: () => Promise.all([...flights].map(flight => flight.promise)).then(() => {}),
    dispose() {
      disposed = true
      for (const flight of flights) flight.controller.abort()
      flights.clear()
    },
  }
}
