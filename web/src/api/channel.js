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

// 微信龙虾机器人绑定
export const getClawbotQRCode = () => {
  return request.post('/channels/clawbot/bind/qrcode')
}

export const getClawbotQRStatus = (qrcode) => {
  return request.get('/channels/clawbot/bind/status', { params: { qrcode } })
}

export const clawbotBindConfirm = (data) => {
  return request.post('/channels/clawbot/bind/confirm', data)
}

export const clawbotRebind = (channelId, data) => {
  return request.put(`/channels/clawbot/bind/${channelId}/rebind`, data)
}
