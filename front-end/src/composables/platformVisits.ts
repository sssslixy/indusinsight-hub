import { START_LOCATION, type RouteLocationNormalized, type Router } from 'vue-router'
import { getAuthToken } from '@/utils/storage/auth'
import { reportPlatformVisit } from '@/api/dashboard'
import { createPlatformVisitTracker } from '@/utils/platformVisitTracker'

let tracker: ReturnType<typeof createPlatformVisitTracker> | undefined
let uninstall: (() => void) | undefined

export function waitForPlatformVisit(): Promise<void> {
  return tracker?.pending() ?? Promise.resolve()
}

/** Install once at app root, rather than once per page or statistics component. */
export function installPlatformVisits(router: Router): () => void {
  if (uninstall) return uninstall
  const current = createPlatformVisitTracker({
    getContext: () => ({
      token: getAuthToken(),
      eligible: router.currentRoute.value.meta.requiresAuth === true && router.currentRoute.value.meta.trackVisit !== false,
    }),
    report: reportPlatformVisit,
  })
  tracker = current
  let lastNavigation: RouteLocationNormalized | undefined
  const navigation = (route: RouteLocationNormalized) => {
    // The initial route may already be committed when the root component installs us.
    if (lastNavigation === route) return
    lastNavigation = route
    void current.pageView()
  }
  const stop = router.afterEach((to, from, failure) => {
    if (failure || (from !== START_LOCATION && to.fullPath === from.fullPath)) return
    navigation(to)
  })
  if (router.currentRoute.value !== START_LOCATION) navigation(router.currentRoute.value)
  const pageshow = (event: PageTransitionEvent) => {
    // A bfcache restore does not run the router again. Normal page loads do.
    if (event.persisted) void current.pageView()
  }
  window.addEventListener('pageshow', pageshow)
  uninstall = () => {
    stop()
    current.dispose()
    window.removeEventListener('pageshow', pageshow)
    tracker = undefined
    uninstall = undefined
  }
  return uninstall
}
