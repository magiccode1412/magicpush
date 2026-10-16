import request from '@/utils/request'

/**
 * 获取 QQ Bot 绑定状态
 */
export const getQqbotBindStatus = (channelId) => {
  return request.get(`/qqbot/bind/${channelId}/status`)
}

/**
 * 启动 QQ Bot 绑定流程（为新建渠道建立 WS 连接）
 */
export const startQqbotBind = (channelId) => {
  return request.post(`/qqbot/bind/${channelId}/start`)
}

/**
 * 重试 QQ Bot 绑定（清除已有绑定，重新监听入站消息）
 */
export const retryQqbotBind = (channelId) => {
  return request.post(`/qqbot/bind/${channelId}/retry`)
}
