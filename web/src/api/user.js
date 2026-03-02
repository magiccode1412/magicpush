import request from '@/utils/request'

export const getCurrentUser = () => {
  return request.get('/users/me')
}

export const updateCurrentUser = (data) => {
  return request.put('/users/me', data)
}

export const changePassword = (data) => {
  return request.put('/users/me/password', data)
}

export const getUserStats = () => {
  return request.get('/users/me/stats')
}

export const exportConfig = () => {
  return request.get('/users/me/export')
}

export const importConfig = (data) => {
  return request.post('/users/me/import', data)
}

export const getRegistrationSetting = () => {
  return request.get('/users/me/settings/registration')
}

export const updateRegistrationSetting = (enabled) => {
  return request.put('/users/me/settings/registration', { enabled })
}
