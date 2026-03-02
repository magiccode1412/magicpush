import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/components/Layout/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'endpoints',
        name: 'Endpoints',
        component: () => import('@/views/endpoints/List.vue'),
      },
      {
        path: 'channels',
        name: 'Channels',
        component: () => import('@/views/channels/List.vue'),
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/logs/List.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/Index.vue'),
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/admin/Users.vue'),
        meta: { admin: true },
      },
      {
        path: 'docs',
        name: 'Docs',
        component: () => import('@/views/Docs.vue'),
      },
      {
        path: 'debug',
        name: 'Debug',
        component: () => import('@/views/Debug.vue'),
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/About.vue'),
      },
      {
        path: 'changelog',
        name: 'Changelog',
        component: () => import('@/views/Changelog.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (!to.meta.public && !authStore.isAuthenticated) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    next('/')
  } else if (to.meta.admin && authStore.user?.role !== 'admin') {
    next('/')
  } else {
    next()
  }
})

export default router
