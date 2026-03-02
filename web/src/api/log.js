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
