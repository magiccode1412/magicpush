import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

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
      // 如果已经标记刷新失败，直接退出
      if (refreshFailed) {
        authStore.logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // 如果正在刷新，等待刷新结果
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((success) => {
            if (success) {
              // 刷新成功，重试请求
              config.headers.Authorization = `Bearer ${authStore.accessToken}`
              resolve(request(config))
            } else {
              // 刷新失败，跳转登录
              authStore.logout()
              window.location.href = '/login'
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
          isRefreshing = false
          refreshFailed = true
          onRefreshed(false)

          authStore.logout()
          window.location.href = '/login'
          ElMessage.error('登录已过期，请重新登录')

          return Promise.reject(error)
        }
      } catch (err) {
        isRefreshing = false
        refreshFailed = true
        onRefreshed(false)

        authStore.logout()
        window.location.href = '/login'
        ElMessage.error('登录已过期，请重新登录')

        return Promise.reject(error)
      }
    }

    // 其他错误正常处理
    const message = response?.data?.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

// 重置刷新状态（用于登录成功后）
export const resetRefreshState = () => {
  isRefreshing = false
  refreshFailed = false
  refreshSubscribers = []
}

export default request
