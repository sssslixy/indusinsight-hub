// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { i18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
import * as api from '@/api/admin'
import AdminLayout from './AdminLayout.vue'
import Editor from './AnnouncementEditor.vue'
import Security from './SecurityPage.vue'
vi.mock('@/api/admin', async (original) => ({
  ...(await original<typeof api>()),
  getAdminAccount: vi.fn(),
  getAdminAnnouncement: vi.fn(),
  saveAdminAnnouncement: vi.fn(),
  changeAdminPassword: vi.fn(),
  logoutAdmin: vi.fn(),
}))
let view: VueWrapper
const row = {
  id: 2,
  title: '平台更新',
  content: '第一段\n第二段',
  status: 1,
  isImportant: true,
  publishTime: '2026-01-01T12:00:00',
  createdAt: '',
  updatedAt: '',
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  i18n.global.locale.value = 'zh-CN'
})
afterEach(() => {
  view?.unmount()
  vi.restoreAllMocks()
})
async function render(
  component: typeof Editor | typeof Security | typeof AdminLayout,
  path: string,
) {
  const pinia = createPinia()
  const user = useUserStore(pinia)
  user.setLoginInfo('token', {
    id: 1,
    account: 'admin',
    phone: null,
    username: '管理员',
    avatar: '',
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/announcements/new', component },
      { path: '/admin/announcements/:id/edit', component },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  view = mount(component, { global: { plugins: [pinia, router, i18n] } })
  await flushPromises()
  return { router, user }
}
describe('admin pages', () => {
  it('server verification is required on entry and retry is offered without losing the session', async () => {
    vi.mocked(api.getAdminAccount).mockRejectedValue(new Error('offline'))
    const { user } = await render(AdminLayout, '/admin')
    expect(view.text()).toContain('暂时无法验证身份')
    expect(user.token).toBe('token')
    vi.mocked(api.getAdminAccount).mockResolvedValue({
      id: 1,
      account: 'admin',
      username: '管理员',
      passwordUpdatedAt: null,
    })
    await view.get('.adm-state button').trigger('click')
    await flushPromises()
    expect(view.text()).not.toContain('暂时无法验证身份')
    expect(user.userInfo?.phone).toBeNull()
  })
  it('published edit keeps status and important flag and saves content immediately', async () => {
    vi.mocked(api.getAdminAnnouncement).mockResolvedValue(row)
    const { router } = await render(Editor, '/admin/announcements/2/edit')
    expect(view.text()).toContain('保存并更新')
    expect((view.get('input[type=checkbox]').element as HTMLInputElement).checked).toBe(true)
    await view.get('textarea').setValue('修改后的正文')
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(api.saveAdminAnnouncement).toHaveBeenCalledWith(2, {
      title: '平台更新',
      content: '修改后的正文',
      status: 1,
      isImportant: 1,
    })
    expect(router.currentRoute.value.path).toBe('/admin/announcements')
  })
  it('failed save retains text; leaving can be cancelled', async () => {
    vi.mocked(api.saveAdminAnnouncement).mockRejectedValue(new Error('保存失败'))
    await render(Editor, '/admin/announcements/new')
    await view.get('#announcement-title').setValue('草稿')
    await view.get('textarea').setValue('待保存内容')
    await view.get('form').trigger('submit')
    await flushPromises()
    expect((view.get('textarea').element as HTMLTextAreaElement).value).toBe('待保存内容')
    expect(api.saveAdminAnnouncement).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ status: 0 }),
    )
  })
  it('password mismatch prevents submission; successful change clears session and navigates to login', async () => {
    const { router, user } = await render(Security, '/admin/security')
    await view.get('#current-password').setValue('old-password')
    await view.get('#new-password').setValue('new-password')
    await view.get('#confirm-password').setValue('different')
    expect(view.get('button').attributes('disabled')).toBeDefined()
    await view.get('#confirm-password').setValue('new-password')
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(api.changeAdminPassword).toHaveBeenCalledWith('old-password', 'new-password')
    expect(user.token).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
  it('changing routes with unsaved text respects the confirmation', async () => {
    // Mount RouterView so Vue Router installs the actual route leave guard.
    const pinia = createPinia()
    const user = useUserStore(pinia)
    user.setLoginInfo('token', {
      id: 1,
      account: 'admin',
      phone: null,
      username: '管理员',
      avatar: '',
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/new', component: Editor },
        { path: '/away', component: { template: '<div>Away</div>' } },
      ],
    })
    await router.push('/new')
    view = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router, i18n] } })
    await flushPromises()
    await view.get('#announcement-title').setValue('未保存')
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    await router.push('/away')
    expect(router.currentRoute.value.path).toBe('/new')
    confirm.mockResolvedValue(undefined as never)
    await router.push('/away')
    expect(router.currentRoute.value.path).toBe('/away')
  })
})
