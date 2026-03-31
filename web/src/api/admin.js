import request from '@/utils/request'

// 用户管理
export const getUsers = (params) => {
  return request.get('/admin/users', { params })
}

export const createUser = (data) => {
  return request.post('/admin/users', data)
}

export const updateUser = (id, data) => {
  return request.put(`/admin/users/${id}`, data)
}

export const deleteUser = (id) => {
  return request.delete(`/admin/users/${id}`)
}

export const resetPassword = (id, newPassword) => {
  return request.put(`/admin/users/${id}/password`, { newPassword })
}

// 限流配置管理
export const getRateLimitConfig = () => {
  return request.get('/admin/rate-limit')
}

export const updateRateLimitConfig = (data) => {
  return request.put('/admin/rate-limit', data)
}

export const resetRateLimitConfig = () => {
  return request.post('/admin/rate-limit/reset')
}
