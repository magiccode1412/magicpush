import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, refreshToken as refreshTokenApi } from '@/api/auth'
import { resetRefreshState } from '@/utils/request'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)

  // Actions
  const setAuthData = (data) => {
    user.value = data.user
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    
    // 重置刷新状态
    resetRefreshState()
  }

  const clearAuthData = () => {
    user.value = null
    accessToken.value = ''
    refreshToken.value = ''
    
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  const loginUser = async (credentials) => {
    const res = await login(credentials)
    if (res.success) {
      setAuthData(res.data)
    }
    return res
  }

  const registerUser = async (userData) => {
    const res = await register(userData)
    if (res.success) {
      setAuthData(res.data)
    }
    return res
  }

  const logout = () => {
    clearAuthData()
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value) return false
    
    try {
      const res = await refreshTokenApi(refreshToken.value)
      if (res.success) {
        accessToken.value = res.data.accessToken
        refreshToken.value = res.data.refreshToken
        localStorage.setItem('accessToken', res.data.accessToken)
        localStorage.setItem('refreshToken', res.data.refreshToken)
        return true
      }
    } catch (error) {
      console.error('刷新令牌失败:', error)
    }
    
    clearAuthData()
    return false
  }

  // 初始化
  const init = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      user.value = JSON.parse(savedUser)
    }
  }

  init()

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    setAuthData,
    clearAuthData,
    loginUser,
    registerUser,
    logout,
    refreshAccessToken,
  }
})
