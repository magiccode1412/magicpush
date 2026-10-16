import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('settings store', () => {
  it('defaults check-update flags correctly', () => {
    const store = useSettingsStore()
    expect(store.checkUpdateEnabled).toBe(true)
    expect(store.checkUpdateDevEnabled).toBe(false)
  })

  it('isProxyEnabled is false when proxy is disabled', () => {
    const store = useSettingsStore()
    expect(store.isProxyEnabled).toBe(false)
  })

  it('isProxyEnabled is true when enabled with a url', () => {
    const store = useSettingsStore()
    store.setProxy(true, 'http://proxy.example.com')
    expect(store.isProxyEnabled).toBe(true)
  })

  it('getBaseUrl returns original url when proxy disabled', () => {
    const store = useSettingsStore()
    const url = 'https://api.example.com/v1/test?x=1'
    expect(store.getBaseUrl(url)).toBe(url)
  })

  it('getBaseUrl rewrites host when proxy enabled', () => {
    const store = useSettingsStore()
    store.setProxy(true, 'http://proxy.example.com:8080')
    const result = store.getBaseUrl('https://api.example.com/v1/test?x=1')
    expect(result).toBe('http://proxy.example.com:8080/v1/test?x=1')
  })

  it('getBaseUrl returns original url on invalid proxy url', () => {
    const store = useSettingsStore()
    store.setProxy(true, 'not-a-url')
    const url = 'https://api.example.com/v1'
    expect(store.getBaseUrl(url)).toBe(url)
  })

  it('setProxy updates proxy state', () => {
    const store = useSettingsStore()
    store.setProxy(true, 'http://proxy.example.com')
    expect(store.proxyEnabled).toBe(true)
    expect(store.proxyUrl).toBe('http://proxy.example.com')
  })

  it('clearProxy resets proxy settings', () => {
    const store = useSettingsStore()
    store.setProxy(true, 'http://proxy.example.com')
    store.clearProxy()
    expect(store.proxyEnabled).toBe(false)
    expect(store.proxyUrl).toBe('')
    expect(store.isProxyEnabled).toBe(false)
  })

  it('persists proxy settings to localStorage', async () => {
    const store = useSettingsStore()
    store.setProxy(true, 'http://proxy.example.com')
    await nextTick()
    expect(localStorage.getItem('proxyEnabled')).toBe('true')
    expect(localStorage.getItem('proxyUrl')).toBe('http://proxy.example.com')
  })
})
