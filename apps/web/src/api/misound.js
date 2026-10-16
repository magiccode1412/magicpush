/**
 * 小爱音箱渠道 API
 *
 * 提供扫码登录、绑定确认等接口调用
 */

import request from '@/utils/request'

/**
 * 初始化扫码登录
 * 获取小米账号的二维码 URL
 *
 * @returns {{ sessionId, qrCodeUrl, loginUrl, timeout }}
 */
export const initMiQRLogin = () => {
  return request.post('/channels/misound/qr/init')
}

/**
 * 轮询扫码状态
 * 长轮询等待用户扫码结果
 *
 * @param {string} sessionId - 会话 ID（从 initMiQRLogin 获取）
 * @returns {{ status, userId?, passToken? }}
 */
export const pollMiQRStatus = (sessionId) => {
  return request.get('/channels/misound/qr/status', {
    params: { sessionId },
    timeout: 330000, // 长轮询超时 330 秒（比服务端多 30 秒）
  })
}

/**
 * 确认绑定（创建渠道）
 *
 * @param {{ userId, passToken, did, name?, ttsMode? }} data
 * @returns {Object} 创建的渠道对象
 */
export const confirmMiBind = (data) => {
  return request.post('/channels/misound/qr/confirm', data)
}

/**
 * 重新绑定已有渠道
 *
 * @param {number} channelId - 渠道 ID
 * @param {{ userId, passToken, did?, ttsMode? }} data
 * @returns {Object} 更新后的渠道对象
 */
export const rebindMiChannel = (channelId, data) => {
  return request.put(`/channels/misound/qr/${channelId}/rebind`, data)
}
