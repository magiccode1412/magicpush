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
