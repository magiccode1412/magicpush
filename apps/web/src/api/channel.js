import request from '@/utils/request'

/**
 * 获取渠道列表
 */
export const getChannels = () => {
  return request.get('/channels')
}

/**
 * 获取支持的渠道类型列表
 */
export const getChannelTypes = () => {
  return request.get('/channels/types')
}

/**
 * 获取单个渠道详情
 */
export const getChannel = (id) => {
  return request.get(`/channels/${id}`)
}

/**
 * 创建渠道
 */
export const createChannel = (data) => {
  return request.post('/channels', data)
}

/**
 * 更新渠道配置
 */
export const updateChannel = (id, data) => {
  return request.put(`/channels/${id}`, data)
}

/**
 * 删除渠道
 */
export const deleteChannel = (id) => {
  return request.delete(`/channels/${id}`)
}

/**
 * 测试渠道连通性
 */
export const testChannel = (id) => {
  return request.post(`/channels/${id}/test`)
}
