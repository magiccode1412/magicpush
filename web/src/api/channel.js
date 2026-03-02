import request from '@/utils/request'

export const getChannels = () => {
  return request.get('/channels')
}

export const getChannelTypes = () => {
  return request.get('/channels/types')
}

export const getChannel = (id) => {
  return request.get(`/channels/${id}`)
}

export const createChannel = (data) => {
  return request.post('/channels', data)
}

export const updateChannel = (id, data) => {
  return request.put(`/channels/${id}`, data)
}

export const deleteChannel = (id) => {
  return request.delete(`/channels/${id}`)
}

export const testChannel = (id) => {
  return request.post(`/channels/${id}/test`)
}
