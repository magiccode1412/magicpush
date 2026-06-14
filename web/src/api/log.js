import request from '@/utils/request'

export const getLogs = (params) => {
  return request.get('/logs', { params })
}

export const getLog = (id) => {
  return request.get(`/logs/${id}`)
}

export const getStats = () => {
  return request.get('/logs/stats/overview')
}

export const clearLogs = () => {
  return request.delete('/logs/clear')
}

export const getAutoCleanupSetting = () => {
  return request.get('/logs/auto-cleanup')
}

export const updateAutoCleanupSetting = (data) => {
  return request.put('/logs/auto-cleanup', data)
}
