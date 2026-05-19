import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 刷新 Token 状态管理
let isRefreshing = false
let refreshFailed = false
let refreshSubscribers = []
let isRedirecting = false // 防止重复跳转

// 添加等待刷新完成的订阅者
const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb)
}

// 通知所有订阅者刷新结果
const onRefreshed = (success) => {
  refreshSubscribers.forEach((cb) => cb(success))
  refreshSubscribers = []
}

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const { response, config } = error
    const authStore = useAuthStore()

    // 处理 401 未授权
    if (response?.status === 401) {
      // 【关键修复】排除刷新接口，避免死循环
      if (config?.url?.includes('/auth/refresh')) {
        // 刷新请求本身返回401 → refresh token也过期了，直接登出
        doLogout()
        return Promise.reject(error)
      }

      // 如果已经标记刷新失败或正在跳转，直接拒绝（防止重复处理）
      if (refreshFailed || isRedirecting) {
        return Promise.reject(error)
      }

      // 如果正在刷新，等待刷新结果
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((success) => {
            if (success) {
              config.headers.Authorization = `Bearer ${authStore.accessToken}`
              resolve(request(config))
            } else {
              resolve(Promise.reject(error))
            }
          })
        })
      }

      // 开始刷新
      isRefreshing = true

      try {
        const refreshed = await authStore.refreshAccessToken()

        if (refreshed) {
          // 刷新成功，通知所有等待的请求
          isRefreshing = false
          onRefreshed(true)

          // 重试当前请求
          config.headers.Authorization = `Bearer ${authStore.accessToken}`
          return request(config)
        } else {
          // 刷新失败
          handleRefreshFail()
          return Promise.reject(error)
        }
      } catch (err) {
        handleRefreshFail()
        return Promise.reject(error)
      }
    }

    // 其他错误正常处理
    const message = response?.data?.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

// 统一登出跳转逻辑
const doLogout = () => {
  if (isRedirecting) return // 防止重复跳转
  isRedirecting = true
  authStore.logout()
  router.push('/login').finally(() => {
    isRedirecting = false
  })
}

// 统一刷新失败处理
const handleRefreshFail = () => {
  isRefreshing = false
  refreshFailed = true
  onRefreshed(false)
  ElMessage.error('登录已过期，请重新登录')
  doLogout()
}

// 重置刷新状态（用于登录成功后）
export const resetRefreshState = () => {
  isRefreshing = false
  refreshFailed = false
  isRedirecting = false
  refreshSubscribers = []
}

export default request
