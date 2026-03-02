import { defineStore } from 'pinia'
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 主题模式: 'auto' | 'light' | 'dark'
  const themeMode = ref(localStorage.getItem('themeMode') || 'auto')
  const systemPrefersDark = ref(false)

  // 计算当前是否为深色模式
  const isDark = computed(() => {
    if (themeMode.value === 'auto') {
      return systemPrefersDark.value
    }
    return themeMode.value === 'dark'
  })

  // 监听系统主题变化
  let mediaQuery = null

  const updateSystemTheme = (e) => {
    systemPrefersDark.value = e.matches
  }

  const initSystemThemeListener = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark.value = mediaQuery.matches
      mediaQuery.addEventListener('change', updateSystemTheme)
    }
  }

  const cleanupSystemThemeListener = () => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', updateSystemTheme)
    }
  }

  // 切换主题模式
  const toggleTheme = () => {
    if (themeMode.value === 'auto') {
      themeMode.value = 'light'
    } else if (themeMode.value === 'light') {
      themeMode.value = 'dark'
    } else {
      themeMode.value = 'auto'
    }
  }

  // 设置特定主题模式
  const setThemeMode = (mode) => {
    themeMode.value = mode
  }

  // 兼容旧方法
  const setTheme = (dark) => {
    themeMode.value = dark ? 'dark' : 'light'
  }

  // 应用主题到 DOM
  watchEffect(() => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('themeMode', themeMode.value)
  })

  // 生命周期
  onMounted(() => {
    initSystemThemeListener()
  })

  onUnmounted(() => {
    cleanupSystemThemeListener()
  })

  return {
    isDark,
    themeMode,
    toggleTheme,
    setTheme,
    setThemeMode,
  }
})
