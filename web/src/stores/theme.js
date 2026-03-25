import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 主题模式: 'light' | 'dark'
  const themeMode = ref(localStorage.getItem('themeMode') || 'dark')

  // 计算当前是否为深色模式
  const isDark = computed(() => {
    return themeMode.value === 'dark'
  })

  let isAnimating = false

  // 切换主题模式 - 带圆形扩展 View Transition 动画
  const toggleTheme = (event) => {
    if (isAnimating) return
    isAnimating = true

    // 获取点击位置
    const x = event ? event.clientX : window.innerWidth / 2
    const y = event ? event.clientY : window.innerHeight / 2

    // 确定目标主题
    const targetTheme = themeMode.value === 'dark' ? 'light' : 'dark'

    // 在 :root 上设置 CSS 变量（View Transitions 会继承）
    document.documentElement.style.setProperty('--click-x', `${x}px`)
    document.documentElement.style.setProperty('--click-y', `${y}px`)

    // 使用 View Transitions API
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        themeMode.value = targetTheme
        localStorage.setItem('themeMode', themeMode.value)
      }).finished.then(() => {
        isAnimating = false
      }).catch(() => {
        isAnimating = false
      })
    } else {
      // 不支持则直接切换
      themeMode.value = targetTheme
      localStorage.setItem('themeMode', themeMode.value)
      isAnimating = false
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
  watch(isDark, (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('themeMode', themeMode.value)
  }, { immediate: true })

  return {
    isDark,
    themeMode,
    toggleTheme,
    setTheme,
    setThemeMode,
  }
})
