import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  refreshToken: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  resetRefreshState: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
import { login, register, refreshToken } from '@/api/auth'
import { resetRefreshState } from '@/utils/request'

const authData = { user: { id: 1, name: 'alice' }, accessToken: 'at', refreshToken: 'rt' }

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('auth store', () => {
  it('is not authenticated initially', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.accessToken).toBe('')
  })

  it('setAuthData stores user and tokens in state and localStorage', () => {
    const store = useAuthStore()
    store.setAuthData(authData)
    expect(store.user).toEqual(authData.user)
    expect(store.accessToken).toBe('at')
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem('accessToken')).toBe('at')
    expect(localStorage.getItem('refreshToken')).toBe('rt')
    expect(localStorage.getItem('user')).toBe(JSON.stringify(authData.user))
    expect(resetRefreshState).toHaveBeenCalled()
  })

  it('clearAuthData removes state and storage', () => {
    const store = useAuthStore()
    store.setAuthData(authData)
    store.clearAuthData()
    expect(store.accessToken).toBe('')
    expect(store.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('loginUser calls api and sets data on success', async () => {
    const store = useAuthStore()
    login.mockResolvedValue({ success: true, data: authData })
    const res = await store.loginUser({ username: 'u', password: 'p' })
    expect(login).toHaveBeenCalledWith({ username: 'u', password: 'p' })
    expect(store.accessToken).toBe('at')
    expect(store.isAuthenticated).toBe(true)
    expect(res.success).toBe(true)
  })

  it('loginUser does not set data on failure', async () => {
    const store = useAuthStore()
    login.mockResolvedValue({ success: false })
    await store.loginUser({ username: 'u' })
    expect(store.accessToken).toBe('')
  })

  it('registerUser calls api and sets data on success', async () => {
    const store = useAuthStore()
    register.mockResolvedValue({ success: true, data: authData })
    await store.registerUser({ username: 'u' })
    expect(register).toHaveBeenCalled()
    expect(store.accessToken).toBe('at')
  })

  it('logout clears auth data', () => {
    const store = useAuthStore()
    store.setAuthData(authData)
    store.logout()
    expect(store.accessToken).toBe('')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('refreshAccessToken returns false without refresh token', async () => {
    const store = useAuthStore()
    const result = await store.refreshAccessToken()
    expect(result).toBe(false)
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it('refreshAccessToken updates tokens on success', async () => {
    const store = useAuthStore()
    store.setAuthData(authData)
    refreshToken.mockResolvedValue({ success: true, data: { accessToken: 'newAt', refreshToken: 'newRt' } })
    const result = await store.refreshAccessToken()
    expect(result).toBe(true)
    expect(store.accessToken).toBe('newAt')
    expect(store.refreshToken).toBe('newRt')
    expect(localStorage.getItem('accessToken')).toBe('newAt')
  })

  it('refreshAccessToken clears data on failure', async () => {
    const store = useAuthStore()
    store.setAuthData(authData)
    refreshToken.mockResolvedValue({ success: false })
    const result = await store.refreshAccessToken()
    expect(result).toBe(false)
    expect(store.accessToken).toBe('')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
