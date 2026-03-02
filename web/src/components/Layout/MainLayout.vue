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
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bell class="w-5 h-5 text-white" />
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
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                ]"
                @click="isMobileMenuOpen = false"
              >
                <component :is="item.icon" class="w-5 h-5" />
                <span class="font-medium">{{ item.name }}</span>
              </router-link>
            </li>
          </ul>
        </nav>

        <!-- 底部信息 -->
        <div class="p-4 border-gray-200 dark:border-gray-700">
          <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
            {{ VERSION.displayName }}
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="lg:ml-64 min-h-screen flex flex-col">
      <!-- 顶部栏 -->
      <header class="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between px-4 py-3">
          <!-- 移动端菜单按钮 -->
          <button
            @click="isMobileMenuOpen = true"
            class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <!-- 面包屑 -->
          <div class="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>首页</span>
            <ChevronRight class="w-4 h-4" />
            <span class="text-gray-900 dark:text-gray-100 font-medium">{{ currentPageName }}</span>
          </div>

          <!-- 右侧操作区 -->
          <div class="flex items-center gap-3">
            <!-- 主题切换 -->
            <button
              @click="themeStore.toggleTheme"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :title="themeStore.themeMode === 'auto' ? '跟随系统' : themeStore.isDark ? '深色模式' : '浅色模式'"
            >
              <Monitor v-if="themeStore.themeMode === 'auto'" class="w-5 h-5 text-blue-500" />
              <Sun v-else-if="themeStore.isDark" class="w-5 h-5 text-yellow-500" />
              <Moon v-else class="w-5 h-5 text-gray-600" />
            </button>

            <!-- 用户菜单 -->
            <el-dropdown @command="handleCommand">
              <div class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <el-avatar :size="32" :src="authStore.user?.avatar">
                  <User class="w-4 h-4" />
                </el-avatar>
                <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ authStore.user?.username }}
                </span>
                <ChevronDown class="w-4 h-4 text-gray-400" />
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="settings">
                    <Settings class="w-4 h-4 mr-2" />
                    个人设置
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <LogOut class="w-4 h-4 mr-2" />
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>

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
  ChevronRight,
  ChevronDown,
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

const currentPageName = computed(() => {
  const item = menuItems.value.find(item => isActive(item.path))
  return item?.name || ''
})

const handleCommand = (command) => {
  if (command === 'settings') {
    router.push('/settings')
  } else if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  }
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
