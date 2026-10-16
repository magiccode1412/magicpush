import request from '@/utils/request'

export const login = (data) => {
  return request.post('/auth/login', data)
}

export const register = (data) => {
  return request.post('/auth/register', data)
}

export const refreshToken = (refreshToken) => {
  return request.post('/auth/refresh', { refreshToken })
}

export const logout = (refreshToken) => {
  return request.post('/auth/logout', { refreshToken })
}

export const checkRegistrationStatus = () => {
  return request.get('/auth/registration-status')
}

export const checkHealth = () => {
  return request.get('/health')
}
