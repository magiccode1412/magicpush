import request from '@/utils/request'

export const pushByToken = (token, data) => {
  return request.post(`/push/${token}`, data)
}

export const pushByEndpoint = (endpointId, data) => {
  return request.post(`/push/by-endpoint/${endpointId}`, data)
}

export const pushByChannel = (channelId, data) => {
  return request.post(`/push/by-channel/${channelId}`, data)
}
