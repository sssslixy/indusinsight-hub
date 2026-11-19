import { afterEach, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useSmsCountdown } from './useSmsCountdown'
afterEach(() => vi.useRealTimers())
it('uses elapsed time and cannot create timers after disposal', () => {
  vi.useFakeTimers()
  const scope = effectScope(); const timer = scope.run(() => useSmsCountdown())!
  timer.start(2); expect(timer.countdown.value).toBe(2)
  vi.advanceTimersByTime(2000); expect(timer.countdown.value).toBe(0); expect(vi.getTimerCount()).toBe(0)
  timer.start(60); scope.stop(); expect(vi.getTimerCount()).toBe(0)
  timer.start(60); expect(vi.getTimerCount()).toBe(0)
})
