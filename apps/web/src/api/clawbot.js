import request from '@/utils/request'

/**
 * 获取微信龙虾机器人绑定二维码
 */
export const getClawbotQRCode = () => {
  return request.post('/channels/clawbot/bind/qrcode')
}

/**
 * 轮询微信龙虾机器人扫码状态
 */
export const getClawbotQRStatus = (qrcode) => {
  return request.get('/channels/clawbot/bind/status', { params: { qrcode } })
}

/**
 * 确认绑定微信龙虾机器人并创建渠道
 */
export const clawbotBindConfirm = (data) => {
  return request.post('/channels/clawbot/bind/confirm', data)
}

/**
 * 重新绑定已有微信龙虾机器人渠道
 */
export const clawbotRebind = (channelId, data) => {
  return request.put(`/channels/clawbot/bind/${channelId}/rebind`, data)
}

/**
 * 检查微信龙虾机器人 context_token 是否就绪
 */
export const checkClawbotContextStatus = (channelId) => {
  return request.get(`/channels/clawbot/bind/${channelId}/context-status`)
}
