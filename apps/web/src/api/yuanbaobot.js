import request from '@/utils/request'

/**
 * 获取元宝 Bot 绑定状态
 */
export const getYuanbaobotBindStatus = (channelId) => {
  return request.get(`/yuanbaobot/bind/${channelId}/status`)
}

/**
 * 重试元宝 Bot 绑定
 */
export const retryYuanbaobotBind = (channelId) => {
  return request.post(`/yuanbaobot/bind/${channelId}/retry`)
}
