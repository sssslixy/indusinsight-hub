// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import AppHeader from '@/components/AppHeader.vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import ProfilePageHeader from '@/components/profile/ProfilePageHeader.vue'
import { getStoredLocale, i18n, LOCALE_STORAGE_KEY, setLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'

vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  setLocale('zh-CN')
  vi.stubGlobal('innerWidth', 1920)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function render(
  path = '/dashboard',
  variant: 'public' | 'app' | 'profile' = 'app',
  loggedIn = true,
) {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push(path)
  const user = useUserStore(pinia)
  if (loggedIn)
    user.setLoginInfo('test-token', {
      id: 7,
      username: '一个很长的用户显示名称',
      avatar: '',
      phone: '',
      account: 'test',
    })
  const Header = { public: AppHeader, app: DashboardHeader, profile: ProfilePageHeader }[variant]
  const Shell = defineComponent({
    components: { HeaderUnderTest: Header },
    setup() {
      return { draft: ref(''), ...useI18n() }
    },
    template:
      '<HeaderUnderTest /><main><input v-model="draft" aria-label="Draft" /><p class="page-copy">{{ t("common.loading") }}</p><button type="button" class="outside">Outside</button></main>',
  })
  wrapper = mount(Shell, { attachTo: document.body, global: { plugins: [pinia, router, i18n] } })
  await flushPromises()
  return { router, user, view: wrapper }
}

describe('shared platform navigation', () => {
  it.each([
    ['/', 'public', false],
    ['/dashboard', 'app', true],
    ['/community/skills?keyword=steel&page=2', 'app', true],
    ['/agents/create?step=2#settings', 'app', true],
    ['/profile', 'profile', true],
  ] as const)(
    'switches language on %s without navigation or losing an input draft',
    async (path, variant, loggedIn) => {
      const { view, router } = await render(path, variant, loggedIn)
      const originalInput = view.get('input').element
      await view.get('input').setValue('未保存的内容 / unsaved draft')
      const push = vi.spyOn(router, 'push')
      const replace = vi.spyOn(router, 'replace')
      expect(view.get('.language-toggle').text()).toBe('English')
      await view.get('.language-toggle').trigger('click')
      expect(view.get('.language-toggle').text()).toBe('中文')
      expect(view.get('.page-copy').text()).toBe('Loading...')
      expect(document.documentElement.lang).toBe('en-US')
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US')
      expect(getStoredLocale()).toBe('en-US')
      expect(ElMessage.success).toHaveBeenLastCalledWith('Switched to English')
      await view.get('.language-toggle').trigger('click')
      expect(view.get('.language-toggle').text()).toBe('English')
      expect(view.get('.page-copy').text()).toBe('加载中...')
      expect(document.documentElement.lang).toBe('zh-CN')
      expect(router.currentRoute.value.fullPath).toBe(path)
      expect(push).not.toHaveBeenCalled()
      expect(replace).not.toHaveBeenCalled()
      expect(view.get('input').element).toBe(originalInput)
      expect((originalInput as HTMLInputElement).value).toBe('未保存的内容 / unsaved draft')
    },
  )

  it('keeps the public header minimal and puts language before the login action', async () => {
    const { view, router } = await render('/', 'public', false)
    expect(view.find('.main-nav').exists()).toBe(false)
    expect(view.find('.mobile-navigation').exists()).toBe(false)
    expect(view.findAll('.header-actions > button').map((button) => button.classes()[0])).toEqual([
      'language-toggle',
      'login-btn',
    ])
    await view.get('.login-btn').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it.each(['/community/skills', '/community/knowledge'])(
    'marks the current resource and navigates to the other community from %s',
    async (path) => {
      const { view, router } = await render(path)
      expect(view.get('.resource-toggle').classes()).toContain('active')
      expect(view.find('.resource-menu').exists()).toBe(false)
      await view.get('.resource-toggle').trigger('click')
      const links = view.findAll('.resource-menu a')
      expect(links.map((link) => link.text())).toEqual(['Skill 社区', '知识库社区'])
      const current = view.get(`.resource-menu a[href="${path}"]`)
      expect(current.attributes('aria-current')).toBe('page')
      expect(current.find('.current-check').exists()).toBe(true)
      const other = path === '/community/skills' ? '/community/knowledge' : '/community/skills'
      await view.get(`.resource-menu a[href="${other}"]`).trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(other)
      expect(view.find('.resource-menu').exists()).toBe(false)
    },
  )

  it('closes on repeat, outside click, language change and route changes, with only one open panel', async () => {
    const { view, router } = await render()
    await view.get('.resource-toggle').trigger('click')
    await view.get('.resource-toggle').trigger('click')
    expect(view.find('.resource-menu').exists()).toBe(false)
    await view.get('.resource-toggle').trigger('click')
    await view.get('.user-info').trigger('click')
    expect(view.find('.resource-menu').exists()).toBe(false)
    expect(view.get('.user-info').attributes('aria-expanded')).toBe('true')
    await view.get('.outside').trigger('click')
    expect(view.find('.user-menu').exists()).toBe(false)
    await view.get('.resource-toggle').trigger('click')
    await view.get('.language-toggle').trigger('click')
    expect(view.find('.resource-menu').exists()).toBe(false)
    await view.get('.resource-toggle').trigger('click')
    expect(view.get('.resource-menu').text()).toContain('Knowledge Base Community')
    await router.push('/announcements?category=all')
    await flushPromises()
    expect(view.find('.resource-menu').exists()).toBe(false)
  })

  it('keeps links focusable, closes on Escape with focus restored, and closes when focus leaves', async () => {
    const { view } = await render()
    const trigger = view.get<HTMLButtonElement>('.resource-toggle')
    trigger.element.focus()
    await trigger.trigger('click')
    const link = view.get<HTMLAnchorElement>('.resource-menu a')
    link.element.focus()
    expect(view.find('.resource-menu').exists()).toBe(true)
    await link.trigger('keydown', { key: 'Escape' })
    expect(view.find('.resource-menu').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    await trigger.trigger('click')
    view.get<HTMLAnchorElement>('.resource-menu a').element.focus()
    view.get<HTMLInputElement>('input').element.focus()
    await flushPromises()
    expect(view.find('.resource-menu').exists()).toBe(false)
  })

  it('exposes all navigation in the compact panel and resets panels when crossing a breakpoint', async () => {
    vi.stubGlobal('innerWidth', 390)
    const { view, router } = await render('/community/knowledge')
    await view.get('.navigation-toggle').trigger('click')
    expect(view.findAll('.mobile-menu a').map((link) => link.attributes('href'))).toEqual([
      '/evaluation',
      '/dashboard',
      '/community/agents',
      '/community/skills',
      '/community/knowledge',
      '/announcements',
      '/manual',
    ])
    expect(view.get('.mobile-menu [aria-current]').text()).toBe('知识库社区')
    await view.get('.user-info').trigger('click')
    expect(view.find('.mobile-menu').exists()).toBe(false)
    await view.get('.navigation-toggle').trigger('click')
    expect(view.find('.user-menu').exists()).toBe(false)
    await view.get('.mobile-menu a[href="/community/skills"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/community/skills')
    expect(view.find('.mobile-menu').exists()).toBe(false)
    await view.get('.navigation-toggle').trigger('click')
    vi.stubGlobal('innerWidth', 1280)
    window.dispatchEvent(new Event('resize'))
    await flushPromises()
    expect(view.find('.mobile-menu').exists()).toBe(false)
    await view.get('.resource-toggle').trigger('click')
    vi.stubGlobal('innerWidth', 1024)
    window.dispatchEvent(new Event('resize'))
    await flushPromises()
    expect(view.find('.resource-menu').exists()).toBe(false)
  })

  it('retains profile/settings return behavior and logging out keeps the language preference', async () => {
    const { view, router, user } = await render('/profile/llm', 'profile')
    const replace = vi.spyOn(router, 'replace')
    await view.get('.user-info').trigger('click')
    await view.get('.user-menu a[href="/profile"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/profile')
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ path: '/profile' }))
    await view.get('.language-toggle').trigger('click')
    await view.get('.user-info').trigger('click')
    await view.get('.logout').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(user.isLoggedIn).toBe(false)
    expect(view.find('.user-menu').exists()).toBe(false)
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US')
  })

  it('removes its global listeners when unmounted', async () => {
    const windowAdd = vi.spyOn(window, 'addEventListener')
    const documentAdd = vi.spyOn(document, 'addEventListener')
    const windowRemove = vi.spyOn(window, 'removeEventListener')
    const documentRemove = vi.spyOn(document, 'removeEventListener')
    await render()
    wrapper!.unmount()
    wrapper = undefined
    for (const type of ['scroll', 'resize']) {
      const registration = windowAdd.mock.calls.find(([event]) => event === type)
      expect(registration).toBeDefined()
      expect(windowRemove).toHaveBeenCalledWith(type, registration![1])
    }
    const registration = documentAdd.mock.calls.find(([event]) => event === 'click')
    expect(registration).toBeDefined()
    expect(documentRemove).toHaveBeenCalledWith('click', registration![1])
  })
})
