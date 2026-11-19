import { START_LOCATION, type Router } from 'vue-router'

const SOURCE_KEY = 'profileReturnTo'
const FALLBACK = '/dashboard'
export const isProfilePath = (path: string) => /^\/profile(?:\/|[?#]|$)/.test(path)

export function validProfileSource(router: Router, value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return false
  const route = router.resolve(value)
  return route.matched.length > 0 && !isProfilePath(route.path) && route.path !== '/login'
}

export function profileReturnTarget(router: Router): string {
  const source = window.history.state?.[SOURCE_KEY]
  return validProfileSource(router, source) ? source : FALLBACK
}

/** Keep the origin on each history entry, including refresh and browser back/forward. */
export function installProfileNavigation(router: Router) {
  let source = FALLBACK
  router.beforeEach((to, from) => {
    if (!isProfilePath(to.path)) return
    source = from !== START_LOCATION && validProfileSource(router, from.fullPath)
      ? from.fullPath : profileReturnTarget(router)
  })
  router.afterEach((to, _from, failure) => {
    if (failure || !isProfilePath(to.path)) return
    const existing = window.history.state?.[SOURCE_KEY]
    window.history.replaceState({
      ...window.history.state,
      [SOURCE_KEY]: validProfileSource(router, existing) ? existing : source,
    }, '')
  })
}

export function backToTarget(router: Router, target: string) {
  if (window.history.state?.back === target) router.back()
  else {
    const route = router.resolve(target)
    void router.replace({ path: route.path, query: route.query, hash: route.hash, state: { [SOURCE_KEY]: profileReturnTarget(router) } })
  }
}

export function returnToProfile(router: Router) {
  const previous = window.history.state?.back
  if (typeof previous === 'string' && /^\/profile(?:[?#]|$)/.test(previous)) router.back()
  else void router.replace({ path: '/profile', state: { [SOURCE_KEY]: profileReturnTarget(router) } })
}
