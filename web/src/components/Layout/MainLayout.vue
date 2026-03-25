<template>
  <div class="min-h-screen" style="background: var(--bg-primary); transition: background var(--transition-normal);">
    <!-- 移动端遮罩 -->
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- 侧边栏 - 液态玻璃效果 -->
    <aside
      :class="[
        'sidebar',
        isMobileMenuOpen ? 'open' : ''
      ]"
    >
      <div class="flex flex-col h-full relative">
        <!-- Logo -->
        <div class="px-5 pt-6 pb-5 border-b" style="border-color: var(--border-subtle);">
          <div class="flex items-center gap-3">
            <img src="/favicon.png" alt="LOGO" class="w-12 h-12">
            <span class="font-display text-xl font-bold text-transparent bg-clip-text" style="background: linear-gradient(to right, #2563eb, #9333ea); -webkit-background-clip: text;">
              MagicPush
            </span>
          </div>
        </div>

        <!-- 导航菜单 -->
        <nav class="flex-1 overflow-y-auto py-4 px-4">
          <ul class="space-y-1">
            <li v-for="item in menuItems" :key="item.path">
              <router-link
                :to="item.path"
                :class="[
                  'sidebar-item',
                  isActive(item.path) ? 'active' : ''
                ]"
                @click="isMobileMenuOpen = false"
              >
                <component :is="item.icon" class="w-5 h-5" />
                <span class="font-medium">{{ item.name }}</span>
              </router-link>
            </li>
          </ul>
        </nav>

        <!-- 底部 - 账号信息、版本号、主题切换和退出登录 -->
        <div class="px-5 py-4 border-t" style="border-color: var(--border-subtle);">
          <!-- 账号信息 -->
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style="background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); color: var(--bg-primary);">
              {{ authStore.user?.username?.charAt(0)?.toUpperCase() || 'A' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-primary font-medium truncate">{{ authStore.user?.username || '管理员' }}</p>
              <p class="text-xs text-muted truncate">{{ authStore.user?.email || 'admin@magicpush.io' }}</p>
            </div>
          </div>

          <!-- 版本号、主题切换和退出登录 -->
          <div class="flex items-center justify-between">
            <!-- 版本号 -->
            <p class="text-xs text-muted">{{ VERSION.displayName }}</p>

            <!-- 主题切换和退出登录 -->
            <div class="flex items-center gap-1">
              <!-- 主题切换图标 -->
              <button
                @click="themeStore.toggleTheme($event)"
                class="p-2 rounded-lg transition-colors"
                :class="themeStore.isDark ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-600 hover:bg-slate-600/10'"
                :title="themeStore.isDark ? '切换到浅色模式' : '切换到深色模式'"
              >
                <!-- 月亮 - 浅色模式显示，点击切换到深色 -->
                <svg v-if="!themeStore.isDark" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
                </svg>
                <!-- 太阳 - 深色模式显示，点击切换到浅色 -->
                <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              </button>

              <!-- 退出登录 -->
              <button @click="handleLogout" class="p-2 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors" title="退出登录">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 移动端菜单按钮 -->
      <button
        @click="isMobileMenuOpen = true"
        class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mb-4"
      >
        <Menu class="w-5 h-5 text-secondary" />
      </button>

      <!-- 页面内容 -->
      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { VERSION } from '@/utils/version'
import {
  Menu,
  LayoutDashboard,
  Link,
  Share2,
  FileText,
  BookOpen,
  Bug,
  Settings,
  Info,
  History,
  Users,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isMobileMenuOpen = ref(false)

// 根据用户角色动态生成菜单
const menuItems = computed(() => {
  const items = [
    { name: '仪表板', path: '/', icon: LayoutDashboard },
    { name: '接口管理', path: '/endpoints', icon: Link },
    { name: '接口文档', path: '/docs', icon: BookOpen },
    { name: '接口调试', path: '/debug', icon: Bug },
    { name: '渠道管理', path: '/channels', icon: Share2 },
    { name: '推送记录', path: '/logs', icon: FileText },
    { name: '更新日志', path: '/changelog', icon: History },
    { name: '设置', path: '/settings', icon: Settings },
    { name: '关于', path: '/about', icon: Info },
  ]

  // 管理员显示用户管理菜单
  if (authStore.user?.role === 'admin') {
    items.splice(1, 0, { name: '用户管理', path: '/users', icon: Users })
  }

  return items
})

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
