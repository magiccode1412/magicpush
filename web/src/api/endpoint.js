import request from '@/utils/request'

export const getEndpoints = (params) => {
  return request.get('/endpoints', { params })
}

export const getEndpoint = (id) => {
  return request.get(`/endpoints/${id}`)
}

export const createEndpoint = (data) => {
  return request.post('/endpoints', data)
}

export const updateEndpoint = (id, data) => {
  return request.put(`/endpoints/${id}`, data)
}

export const deleteEndpoint = (id) => {
  return request.delete(`/endpoints/${id}`)
}

export const regenerateToken = (id) => {
  return request.post(`/endpoints/${id}/regenerate-token`)
}

export const updateEndpointChannels = (id, channelIds) => {
  return request.put(`/endpoints/${id}/channels`, { channelIds })
}

export const validateToken = (token) => {
  return request.post('/endpoints/validate-token', { token })
}

export const getEndpointChannels = (id) => {
  return request.get(`/endpoints/${id}/channels`)
}
