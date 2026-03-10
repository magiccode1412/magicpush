import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // IPv4-to-IPv6 代理设置
  const proxyEnabled = ref(localStorage.getItem('proxyEnabled') === 'true')
  const proxyUrl = ref(localStorage.getItem('proxyUrl') || '')

  // 是否启用代理
  const isProxyEnabled = computed(() => proxyEnabled.value && proxyUrl.value.trim() !== '')

  // 获取实际使用的 baseUrl（代理或原始）
  const getBaseUrl = (originalUrl) => {
    if (!isProxyEnabled.value) {
      return originalUrl
    }
    
    try {
      const original = new URL(originalUrl)
      const proxy = new URL(proxyUrl.value.trim())
      
      // 替换协议、域名和端口，保留路径
      return `${proxy.origin}${original.pathname}${original.search}`
    } catch (e) {
      console.error('代理 URL 解析失败:', e)
      return originalUrl
    }
  }

  // 监听变化并保存到 localStorage
  watch(proxyEnabled, (value) => {
    localStorage.setItem('proxyEnabled', value.toString())
  })

  watch(proxyUrl, (value) => {
    localStorage.setItem('proxyUrl', value)
  })

  // 设置代理
  const setProxy = (enabled, url) => {
    proxyEnabled.value = enabled
    proxyUrl.value = url
  }

  // 清除代理设置
  const clearProxy = () => {
    proxyEnabled.value = false
    proxyUrl.value = ''
  }

  return {
    proxyEnabled,
    proxyUrl,
    isProxyEnabled,
    getBaseUrl,
    setProxy,
    clearProxy,
  }
})
