import { onScopeDispose, ref } from 'vue'

/** UI only; the server remains authoritative for all rate limits. */
export function useSmsCountdown() {
  const countdown = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined
  let disposed = false
  function stop() {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
    countdown.value = 0
  }
  function start(seconds: number) {
    if (disposed) return
    stop()
    const deadline = Date.now() + seconds * 1000
    countdown.value = Math.max(0, seconds)
    timer = setInterval(() => {
      countdown.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (countdown.value === 0) stop()
    }, 1000)
  }
  onScopeDispose(() => {
    disposed = true
    stop()
  })
  return { countdown, start }
}
