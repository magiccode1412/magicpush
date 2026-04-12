<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <!-- 移动端遮罩 -->
    <div 
      v-if="isMobileMenuOpen" 
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- 侧边栏 -->
    <aside 
      :class="[
        'fixed left-0 top-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-6 py-5 border-gray-200 dark:border-gray-700">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center">
          <!-- <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"> -->
            <!-- <Bell class="w-5 h-5 text-white" /> -->
           <img src="/favicon.png" alt="LOGO">  
          </div>
          <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            MagicPush
          </span>
        </div>

        <!-- 导航菜单 -->
        <nav class="flex-1 overflow-y-auto py-4 px-3">
          <ul class="space-y-1">
            <li v-for="item in menuItems" :key="item.path">
              <router-link
                :to="item.path"
                :class="[
                  'nav-item flex items-center gap-3 px-4 py-3 rounded-lg',
                  isActive(item.path)
                    ? 'nav-active bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                ]"
                @click="isMobileMenuOpen = false"
              >
                <component :is="item.icon" class="w-5 h-5" />
                <span class="font-medium">{{ item.name }}</span>
              </router-link>
            </li>
          </ul>
        </nav>

        <!-- 底部：用户信息 + 操作 -->
        <div class="p-3">
          <div class="flex items-center gap-3 px-2 mb-3">
            <el-avatar :size="32" :src="authStore.user?.avatar">
              <User class="w-4 h-4" />
            </el-avatar>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ authStore.user?.username }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ authStore.user?.email }}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between px-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ VERSION.displayName }}
            </span>
            <div class="flex items-center gap-1">
              <button
                @click="themeStore.toggleTheme"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :title="themeStore.themeMode === 'auto' ? '跟随系统' : themeStore.isDark ? '深色模式' : '浅色模式'"
              >
                <Monitor v-if="themeStore.themeMode === 'auto'" class="w-4 h-4 text-blue-500" />
                <Sun v-else-if="themeStore.isDark" class="w-4 h-4 text-yellow-500" />
                <Moon v-else class="w-4 h-4 text-gray-600" />
              </button>
              <button
                @click="handleLogout"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="退出登录"
              >
                <LogOut class="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="lg:ml-64 min-h-screen flex flex-col">
      <!-- 移动端菜单按钮 -->
      <div class="lg:hidden sticky top-0 z-30 p-3">
        <button
          @click="isMobileMenuOpen = true"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 bg-white/80 dark:bg-gray-700/80 shadow-sm"
        >
          <Menu class="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <!-- 页面内容 -->
      <main class="flex-1 p-4 lg:p-6">
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
  Bell,
  Menu,
  User,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  LayoutDashboard,
  Link,
  Share2,
  FileText,
  BookOpen,
  Bug,
  Info,
  History,
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
  isMobileMenuOpen.value = false
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

.nav-item {
  position: relative;
  overflow: hidden;
}

.nav-item > * {
  position: relative;
  z-index: 1;
}

.nav-item:not(.nav-active)::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: #eff6ffd0;
  border-radius: inherit;
  clip-path: inset(0 100% 0 0);
  transition: clip-path 0.3s ease-out;
}

html.dark .nav-item:not(.nav-active)::before {
  background-color: rgba(55, 65, 81, 0.3);
}

.nav-item:not(.nav-active):hover::before {
  clip-path: inset(0 0 0 0);
  transition: clip-path 0.3s ease-in;
}
</style>
