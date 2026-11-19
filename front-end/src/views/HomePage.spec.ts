// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import zhCN from '@/i18n/messages/zh-CN'
import enUS from '@/i18n/messages/en-US'
import { useUserStore } from '@/stores/user'
import HomePage from './HomePage.vue'

let wrapper: VueWrapper
beforeEach(() => localStorage.clear())
afterEach(() => wrapper?.unmount())

async function render(locale: 'zh-CN' | 'en-US', loggedIn = false) {
  const pinia = createPinia()
  // Only the public landing page is under test; no stored credentials or business requests.
  useUserStore(pinia).$patch({ token: loggedIn ? 'test-session' : null })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/login', '/dashboard'].map(path => ({ path, component: { template: '<div />' } })),
  })
  await router.push('/')
  const i18n = createI18n({ legacy: false, locale, messages: { 'zh-CN': zhCN, 'en-US': enUS } })
  wrapper = mount(HomePage, {
    global: { plugins: [pinia, router, i18n], stubs: { Avatar: true } },
  })
  return router
}

describe('platform introduction', () => {
  it.each(['zh-CN', 'en-US'] as const)('describes current capabilities in %s without legacy claims', async locale => {
    await render(locale)
    const messages = locale === 'zh-CN' ? zhCN.home : enUS.home
    const text = wrapper.text()
    for (const content of [messages.normalMode, messages.professionalMode, messages.modelPrerequisite,
      messages.skillReferenceDesc, messages.agentCommunity, messages.skillCommunity,
      messages.knowledgeCommunity, messages.workflowPrepareTitle, messages.workflowResultDesc]) {
      expect(text).toContain(content)
    }
    expect(wrapper.findAll('main > section')).toHaveLength(6)
    expect(wrapper.findAll('.stage-flow li')).toHaveLength(5)
    expect(wrapper.findAll('.app-footer')).toHaveLength(1)
    expect(text).not.toMatch(/七个|seven|tool生成|tool generation|评测排行榜|evaluation leaderboard|home\.[a-zA-Z]/i)
    expect(wrapper.find('a[href="/evaluation"]').exists()).toBe(false)
  })

  it.each([false, true])('routes both primary actions using login state (%s)', async loggedIn => {
    const router = await render('zh-CN', loggedIn)
    const destination = loggedIn ? '/dashboard' : '/login'
    const label = loggedIn ? zhCN.home.startUsing : zhCN.home.loginSystem
    for (const selector of ['.hero-actions .primary-btn', '.cta-btn']) {
      expect(wrapper.get(selector).text()).toBe(label)
      await wrapper.get(selector).trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(destination)
      await router.push('/')
    }
    if (!loggedIn) {
      await wrapper.get('.app-header .login-btn').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/login')
    }
  })
})
