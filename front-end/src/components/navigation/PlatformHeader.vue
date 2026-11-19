<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { returnToProfile } from '@/router/profileNavigation'
import { Avatar } from '@/components/base'
import logoImage from '@/assets/logo/logo_buaa.png'
import HeaderIcon from './HeaderIcon.vue'
import LanguageToggle from './LanguageToggle.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'public' | 'app'
    enableProfileFallback?: boolean
  }>(),
  { variant: 'app', enableProfileFallback: true },
)

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t, locale } = useI18n()
const id = useId()
const isScrolled = ref(false)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentUser = computed(() => userStore.userInfo)
const showNavigation = computed(() => props.variant === 'app')
const brandTarget = computed(() =>
  props.variant === 'app' || isLoggedIn.value ? '/dashboard' : '/',
)

const leadingLinks = [
  { to: '/evaluation', label: 'evaluation.title' },
  { to: '/dashboard', label: 'profile.dashboard' },
  { to: '/community/agents', label: 'profile.agentCommunity' },
] as const
const trailingLinks = [
  { to: '/announcements', label: 'profile.announcements' },
  { to: '/manual', label: 'profile.userManual' },
] as const
const resourceLinks = [
  { to: '/community/skills', label: 'navigation.skillCommunity', icon: 'grid' },
  { to: '/community/knowledge', label: 'profile.knowledgeCommunity', icon: 'database' },
] as const
const userLinks = [
  { to: '/profile', label: 'profile.pageTitle', icon: 'user' },
  { to: '/my/agents', label: 'profile.myAgents', icon: 'agent' },
  { to: '/my/skills', label: 'profile.mySkills', icon: 'skill' },
  { to: '/my/favorites', label: 'profile.myFavorites', icon: 'star' },
] as const

const isActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`)
const isResourceActive = computed(() => resourceLinks.some((link) => isActive(link.to)))
const href = (path: string) => router.resolve(path).href

type Panel = 'resources' | 'user' | 'navigation'
const openPanel = ref<Panel | null>(null)
const resourceRoot = ref<HTMLElement | null>(null)
const userRoot = ref<HTMLElement | null>(null)
const navigationRoot = ref<HTMLElement | null>(null)
const resourceButton = ref<HTMLButtonElement | null>(null)
const userButton = ref<HTMLButtonElement | null>(null)
const navigationButton = ref<HTMLButtonElement | null>(null)
const desktopNav = ref<HTMLElement | null>(null)
const roots = { resources: resourceRoot, user: userRoot, navigation: navigationRoot }
const buttons = { resources: resourceButton, user: userButton, navigation: navigationButton }

function closePanel() {
  openPanel.value = null
}
function togglePanel(panel: Panel) {
  openPanel.value = openPanel.value === panel ? null : panel
}

function handleEscape(event: KeyboardEvent) {
  if (!openPanel.value) return
  event.preventDefault()
  event.stopPropagation()
  const trigger = buttons[openPanel.value].value
  closePanel()
  void nextTick(() => trigger?.focus())
}

function handleOutsideClick(event: MouseEvent) {
  if (
    openPanel.value &&
    event.target instanceof Node &&
    !roots[openPanel.value].value?.contains(event.target)
  ) {
    closePanel()
  }
}

function handleFocusOut(event: FocusEvent, panel: Panel) {
  if (openPanel.value !== panel) return
  if (!(event.relatedTarget instanceof Node) || !roots[panel].value?.contains(event.relatedTarget))
    closePanel()
}

function navigateTo(path: string) {
  closePanel()
  if (path === '/profile' && route.path === '/profile/llm') returnToProfile(router)
  else void router.push(path)
}

function handleNavigation(event: MouseEvent, path: string) {
  // Keep native open-in-new-tab/window behavior for modified link clicks.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return
  event.preventDefault()
  navigateTo(path)
}

function logout() {
  closePanel()
  userStore.clearLoginInfo()
  void router.push('/login')
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}
const layoutAt = (width: number) =>
  width >= 1440
    ? 'wide'
    : width >= 1280
      ? 'desktop'
      : width > 768
        ? 'compact'
        : width > 480
          ? 'small'
          : 'phone'
let previousLayout = ''
function handleResize() {
  const layout = layoutAt(window.innerWidth)
  if (layout === previousLayout) return
  previousLayout = layout
  const panel = openPanel.value
  if (!panel) return
  const hadFocus = roots[panel].value?.contains(document.activeElement)
  closePanel()
  if (hadFocus) {
    void nextTick(() => {
      const target =
        panel === 'resources' && window.innerWidth < 1280
          ? navigationButton.value
          : panel === 'navigation' && window.innerWidth >= 1280
            ? desktopNav.value?.querySelector<HTMLAnchorElement>('a')
            : buttons[panel].value
      target?.focus()
    })
  }
}

watch(() => route.fullPath, closePanel)
watch(locale, closePanel)
watch(isLoggedIn, closePanel)
onMounted(() => {
  handleScroll()
  handleResize()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
  document.addEventListener('click', handleOutsideClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <header class="platform-header" :class="{ scrolled: isScrolled }" @keydown.esc="handleEscape">
    <div class="header-container" :class="{ 'with-navigation': showNavigation }">
      <a
        class="brand"
        :href="href(brandTarget)"
        :aria-label="t('profile.systemName')"
        @click="handleNavigation($event, brandTarget)"
      >
        <img :src="logoImage" alt="" class="logo" />
        <div class="brand-text">
          <div class="system-name" :title="t('profile.systemName')">
            {{ t('profile.systemName') }}
          </div>
          <div class="institution-name" :title="t('profile.institutionName')">
            {{ t('profile.institutionName') }}
          </div>
        </div>
      </a>

      <nav
        v-if="showNavigation"
        ref="desktopNav"
        class="main-nav"
        :aria-label="t('navigation.primary')"
      >
        <a
          v-for="link in leadingLinks"
          :key="link.to"
          class="nav-item"
          :href="href(link.to)"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          @click="handleNavigation($event, link.to)"
          >{{ t(link.label) }}</a
        >
        <div
          ref="resourceRoot"
          class="resource-dropdown"
          @focusout="handleFocusOut($event, 'resources')"
        >
          <button
            ref="resourceButton"
            class="nav-item resource-toggle"
            :class="{ active: isResourceActive }"
            type="button"
            :aria-expanded="openPanel === 'resources'"
            :aria-controls="`${id}-resources`"
            @click="togglePanel('resources')"
          >
            {{ t('navigation.communityResources') }}
            <HeaderIcon
              name="chevron"
              class="dropdown-icon"
              :class="{ open: openPanel === 'resources' }"
            />
          </button>
          <Transition name="header-dropdown">
            <ul
              v-if="openPanel === 'resources'"
              :id="`${id}-resources`"
              class="dropdown-menu resource-menu"
            >
              <li v-for="link in resourceLinks" :key="link.to">
                <a
                  class="menu-item"
                  :href="href(link.to)"
                  :aria-current="isActive(link.to) ? 'page' : undefined"
                  @click="handleNavigation($event, link.to)"
                >
                  <HeaderIcon :name="link.icon" />
                  <span>{{ t(link.label) }}</span>
                  <HeaderIcon v-if="isActive(link.to)" name="check" class="current-check" />
                </a>
              </li>
            </ul>
          </Transition>
        </div>
        <a
          v-for="link in trailingLinks"
          :key="link.to"
          class="nav-item"
          :href="href(link.to)"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          @click="handleNavigation($event, link.to)"
          >{{ t(link.label) }}</a
        >
      </nav>

      <div class="header-actions">
        <LanguageToggle @change="closePanel" />
        <button v-if="!isLoggedIn" class="login-btn" type="button" @click="navigateTo('/login')">
          {{ t('common.login') }}
        </button>
        <div
          v-else
          ref="userRoot"
          class="user-area user-dropdown"
          @focusout="handleFocusOut($event, 'user')"
        >
          <button
            ref="userButton"
            class="user-info"
            type="button"
            :aria-label="t('navigation.userMenu')"
            :aria-expanded="openPanel === 'user'"
            :aria-controls="`${id}-user`"
            @click="togglePanel('user')"
          >
            <Avatar
              :src="currentUser?.avatar"
              decorative
              :size="32"
              :enable-profile-fallback="enableProfileFallback"
              class="user-avatar"
            />
            <span class="user-name" :title="currentUser?.username">{{
              currentUser?.username || t('common.user')
            }}</span>
            <HeaderIcon
              name="chevron"
              class="dropdown-icon"
              :class="{ open: openPanel === 'user' }"
            />
          </button>
          <Transition name="header-dropdown">
            <ul v-if="openPanel === 'user'" :id="`${id}-user`" class="dropdown-menu user-menu">
              <li v-for="link in userLinks" :key="link.to">
                <a
                  class="menu-item"
                  :href="href(link.to)"
                  :aria-current="isActive(link.to) ? 'page' : undefined"
                  @click="handleNavigation($event, link.to)"
                >
                  <HeaderIcon :name="link.icon" />
                  <span>{{ t(link.label) }}</span>
                </a>
              </li>
              <li class="logout-row">
                <button class="menu-item logout" type="button" @click="logout">
                  <HeaderIcon name="logout" />
                  {{ t('profile.logout') }}
                </button>
              </li>
            </ul>
          </Transition>
        </div>

        <div
          v-if="showNavigation"
          ref="navigationRoot"
          class="mobile-navigation"
          @focusout="handleFocusOut($event, 'navigation')"
        >
          <button
            ref="navigationButton"
            class="navigation-toggle"
            type="button"
            :aria-label="
              t(openPanel === 'navigation' ? 'navigation.closeMenu' : 'navigation.openMenu')
            "
            :aria-expanded="openPanel === 'navigation'"
            :aria-controls="`${id}-navigation`"
            @click="togglePanel('navigation')"
          >
            <HeaderIcon :name="openPanel === 'navigation' ? 'close' : 'menu'" :size="20" />
          </button>
          <Transition name="header-dropdown">
            <nav
              v-if="openPanel === 'navigation'"
              :id="`${id}-navigation`"
              class="dropdown-menu mobile-menu"
              :aria-label="t('navigation.primary')"
            >
              <ul>
                <li v-for="link in leadingLinks" :key="link.to">
                  <a
                    class="menu-item"
                    :href="href(link.to)"
                    :aria-current="isActive(link.to) ? 'page' : undefined"
                    @click="handleNavigation($event, link.to)"
                    >{{ t(link.label) }}</a
                  >
                </li>
                <li class="resource-group">
                  <div :id="`${id}-resource-group`" class="menu-group-title">
                    {{ t('navigation.communityResources') }}
                  </div>
                  <ul :aria-labelledby="`${id}-resource-group`">
                    <li v-for="link in resourceLinks" :key="link.to">
                      <a
                        class="menu-item"
                        :href="href(link.to)"
                        :aria-current="isActive(link.to) ? 'page' : undefined"
                        @click="handleNavigation($event, link.to)"
                      >
                        <HeaderIcon :name="link.icon" />
                        <span>{{ t(link.label) }}</span>
                        <HeaderIcon v-if="isActive(link.to)" name="check" class="current-check" />
                      </a>
                    </li>
                  </ul>
                </li>
                <li v-for="link in trailingLinks" :key="link.to">
                  <a
                    class="menu-item"
                    :href="href(link.to)"
                    :aria-current="isActive(link.to) ? 'page' : undefined"
                    @click="handleNavigation($event, link.to)"
                    >{{ t(link.label) }}</a
                  >
                </li>
              </ul>
            </nav>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.platform-header {
  --header-nav-gap: 24px;
  --header-nav-font-size: 14px;
  --header-nav-line-height: 20px;
  position: fixed;
  inset: 0 0 auto;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--app-color-border-soft);
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease;
}
.platform-header.scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.header-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--header-nav-gap);
  width: 100%;
  height: var(--app-page-top-desktop);
  padding: 0 48px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 1 1 0;
  min-width: 0;
  text-decoration: none;
}
.logo {
  height: 58px;
  width: auto;
  flex-shrink: 0;
}
.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.system-name,
.institution-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}
.system-name {
  font-size: 19px;
  font-weight: 600;
  color: var(--app-color-text-primary);
  letter-spacing: -0.01em;
}
.institution-name {
  font-size: 14px;
  color: var(--app-color-text-secondary);
}
.main-nav,
.header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.main-nav {
  gap: var(--header-nav-gap);
}
.header-actions {
  gap: 12px;
}
.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #525252;
  font-size: var(--header-nav-font-size);
  font-weight: 500;
  line-height: var(--header-nav-line-height);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}
.nav-item:hover,
.nav-item.active,
.nav-item[aria-current] {
  color: var(--app-color-text-primary);
}
.resource-toggle[aria-expanded='true'] {
  color: var(--app-color-text-primary);
}
.resource-dropdown {
  display: flex;
  align-items: center;
}
.resource-dropdown,
.user-dropdown {
  position: relative;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--app-radius-md);
  background: transparent;
  color: var(--app-color-text-primary);
  cursor: pointer;
  transition: background-color 150ms ease;
}
.user-info:hover,
.user-info[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.04);
}
.user-avatar {
  border: 1px solid var(--app-color-border-soft);
}
.user-name {
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
}
.dropdown-icon {
  flex-shrink: 0;
  color: var(--app-color-text-secondary);
  transition: transform 150ms ease;
}
.dropdown-icon.open {
  transform: rotate(180deg);
}
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  z-index: 1;
  margin: 0;
  padding: 8px;
  max-width: calc(100vw - 32px);
  border: 1px solid var(--app-color-border-soft);
  border-radius: var(--app-radius-md);
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.resource-menu {
  left: 0;
  width: max-content;
  min-width: 176px;
}
.user-menu {
  right: 0;
  width: 200px;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
ul.dropdown-menu {
  padding: 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #525252;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  text-decoration: none;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.menu-item:hover,
.menu-item[aria-current] {
  background: rgba(0, 0, 0, 0.04);
  color: var(--app-color-text-primary);
}
.menu-item[aria-current] {
  font-weight: 500;
}
.menu-item svg {
  flex-shrink: 0;
}
.current-check {
  margin-left: auto;
}
.logout-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.menu-item.logout {
  color: #dc2626;
}
.menu-item.logout:hover {
  background: rgba(220, 38, 38, 0.08);
}
.login-btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: 10px 24px;
  border: 0;
  border-radius: var(--app-radius-md);
  background: #2d2d2d;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.login-btn:hover {
  background: #3a3a3a;
}
.mobile-navigation {
  display: none;
}
.navigation-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--app-radius-md);
  background: transparent;
  color: var(--app-color-text-primary);
  cursor: pointer;
}
.navigation-toggle:hover,
.navigation-toggle[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.04);
}
.mobile-menu {
  /* Use the header's available width, including space reserved for the scrollbar. */
  top: calc(50% + 30px);
  right: 24px;
  width: 320px;
  max-width: calc(100% - 48px);
  max-height: calc(100dvh - var(--app-page-top-desktop) - 24px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.mobile-menu .menu-item {
  white-space: normal;
}
.resource-group {
  margin: 4px 0;
  padding: 4px 0;
  border-block: 1px solid rgba(0, 0, 0, 0.06);
}
.menu-group-title {
  padding: 8px 12px 4px;
  color: var(--app-color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--app-color-text-primary);
  outline-offset: 3px;
}
.header-dropdown-enter-active,
.header-dropdown-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.header-dropdown-enter-from,
.header-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (min-width: 1280px) {
  .header-container.with-navigation .brand {
    flex: 0 1 auto;
  }
  .main-nav {
    /* Center links in the remaining space between the brand and the user controls. */
    flex: 1 0 auto;
    justify-content: center;
  }
}
@media (max-width: 1599px) {
  .platform-header {
    --header-nav-gap: 16px;
    --header-nav-font-size: 13px;
  }
  .header-container {
    padding-inline: 24px;
  }
  .brand {
    gap: 12px;
  }
  .logo {
    height: 50px;
  }
  .system-name {
    font-size: 17px;
  }
  .institution-name {
    font-size: 12px;
  }
}
@media (max-width: 1439px) {
  .user-name {
    display: none;
  }
}
@media (max-width: 1279px) {
  .main-nav {
    display: none;
  }
  .mobile-navigation {
    display: block;
  }
}
@media (max-width: 768px) {
  .header-container {
    height: var(--app-page-top-mobile);
    padding-inline: 24px;
    gap: 12px;
  }
  .brand {
    gap: 10px;
  }
  .logo {
    height: 44px;
  }
  .system-name {
    font-size: 15px;
  }
  .institution-name {
    font-size: 11px;
  }
  .header-actions {
    gap: 8px;
  }
  .user-info {
    gap: 6px;
    padding-inline: 6px;
  }
  .mobile-menu {
    max-height: calc(100dvh - var(--app-page-top-mobile) - 24px);
  }
}
@media (max-width: 480px) {
  .header-container {
    padding-inline: 16px;
    gap: 8px;
  }
  .brand-text {
    display: none;
  }
  .login-btn {
    padding-inline: 18px;
  }
  .mobile-menu {
    right: 16px;
    max-width: calc(100% - 32px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .platform-header,
  .nav-item,
  .user-info,
  .menu-item,
  .dropdown-icon,
  .header-dropdown-enter-active,
  .header-dropdown-leave-active {
    transition: none;
  }
}
</style>
