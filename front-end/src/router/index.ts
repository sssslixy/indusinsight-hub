import { createRouter, createWebHistory } from 'vue-router'
import { getAuthToken } from '@/utils/storage/auth'
import { useUserStore } from '@/stores/user'
import { installProfileNavigation } from './profileNavigation'
import HomePage from '@/views/HomePage.vue'
import LoginPage from '@/views/LoginPage.vue'
import DashboardPage from '@/views/DashboardPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, trackVisit: false },
      children: [
        { path: '', redirect: '/admin/announcements' },
        { path: 'announcements', component: () => import('@/views/admin/AnnouncementsPage.vue') },
        { path: 'announcements/new', component: () => import('@/views/admin/AnnouncementEditor.vue') },
        { path: 'announcements/:id/edit', component: () => import('@/views/admin/AnnouncementEditor.vue') },
        { path: 'security', component: () => import('@/views/admin/SecurityPage.vue') },
      ],
    },
    {
      path: '/evaluation',
      name: 'evaluation',
      component: () => import('@/views/evaluation/index.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: { requiresAuth: false }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/community/agents',
      name: 'community-agents',
      component: () => import('@/views/community/agents/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/community/agents/:id',
      name: 'community-agent-detail',
      redirect: to => ({
        path: `/agents/${to.params.id}/use`,
        query: { ...to.query, from: 'community' },
      }),
      meta: { requiresAuth: true }
    },
    {
      path: '/community/skills',
      name: 'community-skills',
      component: () => import('@/views/community/skills/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/community/tools',
      name: 'community-tools',
      redirect: '/dashboard',
      meta: { requiresAuth: true }
    },
    {
      path: '/community/knowledge',
      name: 'community-knowledge',
      component: () => import('@/views/community/knowledge/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/announcements',
      name: 'announcements',
      component: () => import('@/views/announcements/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/announcements/:id',
      name: 'announcement-detail',
      component: () => import('@/views/announcements/detail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/agents/create',
      name: 'create-agent',
      component: () => import('@/views/agents/create/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/skills/create',
      name: 'create-skill',
      component: () => import('@/views/skills/create/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/knowledge/create',
      name: 'create-knowledge',
      component: () => import('@/views/knowledge/create/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/agents',
      name: 'my-agents',
      component: () => import('@/views/my-agents/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/agents/:id',
      name: 'my-agent-detail',
      redirect: to => `/my/agents/${to.params.id}/edit`,
      meta: { requiresAuth: true }
    },
    {
      path: '/my/agents/:id/edit',
      name: 'my-agent-edit',
      component: () => import('@/views/agents/create/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/agents/:id/use',
      name: 'agent-use',
      component: () => import('@/views/agents/use/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/agents/:id',
      name: 'agent-detail-legacy',
      redirect: to => ({ path: `/agents/${to.params.id}/use` }),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/skills',
      name: 'my-skills',
      component: () => import('@/views/my-skills/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/skills/:id/edit',
      name: 'my-skill-edit',
      component: () => import('@/views/skills/create/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/tools',
      name: 'my-tools',
      redirect: '/dashboard',
      meta: { requiresAuth: true }
    },
    {
      path: '/tools/create',
      name: 'create-tool',
      redirect: '/dashboard',
      meta: { requiresAuth: true }
    },
    {
      path: '/my/tools/:id/edit',
      name: 'my-tool-edit',
      redirect: '/dashboard',
      meta: { requiresAuth: true }
    },
    {
      path: '/my/knowledge',
      name: 'my-knowledge',
      component: () => import('@/views/knowledge/my/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/knowledge/:id/edit',
      name: 'my-knowledge-edit',
      component: () => import('@/views/knowledge/create/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/knowledge/:id/documents',
      name: 'my-knowledge-documents',
      component: () => import('@/views/knowledge-base/DocumentManagement.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/knowledge/:id/search-test',
      name: 'my-knowledge-search-test',
      component: () => import('@/views/knowledge/my/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my/favorites',
      name: 'my-favorites',
      component: () => import('@/views/my-favorites/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/manual',
      name: 'manual',
      component: () => import('@/views/manual/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile/llm',
      name: 'llm-settings',
      component: () => import('@/views/profile/LlmSettings.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfilePage.vue'),
      meta: { requiresAuth: true }
    }
  ],
  // 每次路由跳转时，默认滚动到页面顶部；如果浏览器有保存位置（如后退），则优先使用保存位置
  scrollBehavior(_to, _from, savedPosition) {
    try {
      if (savedPosition) {
        return savedPosition
      }
      return { left: 0, top: 0 }
    } catch (e) {
      console.warn('路由滚动恢复失败，降级为顶部定位', e)
      return { left: 0, top: 0 }
    }
  },
})

// 路由守卫
router.beforeEach((to, _from) => {
  const token = getAuthToken()
  const user = useUserStore()
  if (token && to.path === '/dashboard' && user.isAdmin) return '/admin/announcements'
  if (token && to.meta.requiresAdmin && (user.adminAccessDenied || (user.userInfo && !user.isAdmin))) return '/dashboard'

  if (to.meta.requiresAuth) {
    if (token) {
      return true
    }
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

installProfileNavigation(router)

export default router
