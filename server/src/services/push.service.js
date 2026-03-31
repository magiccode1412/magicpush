const { EndpointModel, ChannelModel, PushLogModel } = require('../models');
const { getChannelAdapter } = require('./channels');
const logger = require('../utils/logger');

/**
 * 推送服务
 */
class PushService {
  /**
   * 通过接口令牌推送
   */
  static async pushByToken(token, message, clientIp) {
    const endpoint = await EndpointModel.findByToken(token);
    if (!endpoint) {
      throw new Error('无效的接口令牌');
    }

    if (!endpoint.is_active) {
      throw new Error('接口已禁用');
    }

    // 更新最后使用时间
    await EndpointModel.updateLastUsed(endpoint.id);

    // 获取接口关联的渠道
    const channels = await EndpointModel.getChannels(endpoint.id);
    if (!channels || channels.length === 0) {
      throw new Error('该接口未绑定任何渠道');
    }

    return await this.pushToChannels(endpoint.user_id, endpoint.id, channels, message, clientIp);
  }

  /**
   * 通过接口ID推送
   */
  static async pushByEndpoint(endpointId, userId, message, clientIp) {
    const endpoint = await EndpointModel.findById(endpointId);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    if (!endpoint.is_active) {
      throw new Error('接口已禁用');
    }

    // 更新最后使用时间
    await EndpointModel.updateLastUsed(endpoint.id);

    // 获取接口关联的渠道
    const channels = await EndpointModel.getChannels(endpoint.id);
    if (!channels || channels.length === 0) {
      throw new Error('该接口未绑定任何渠道');
    }

    return await this.pushToChannels(userId, endpoint.id, channels, message, clientIp);
  }

  /**
   * 通过渠道ID推送
   */
  static async pushByChannel(channelId, userId, message, clientIp) {
    const channel = await ChannelModel.findById(channelId);
    if (!channel || channel.user_id !== userId) {
      throw new Error('渠道不存在');
    }

    if (!channel.is_active) {
      throw new Error('渠道已禁用');
    }

    return await this.pushToChannels(userId, null, [channel], message, clientIp);
  }

  /**
   * 推送到多个渠道
   */
  static async pushToChannels(userId, endpointId, channels, message, clientIp) {
    const { title, content, type = 'text', url } = message;
    const results = [];

    for (const channel of channels) {
      const result = await this.pushToChannel(userId, endpointId, channel, { title, content, type, url }, clientIp);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return {
      success: failedCount === 0,
      total: results.length,
      successCount,
      failedCount,
      results,
    };
  }

  /**
   * 推送到单个渠道
   */
  static async pushToChannel(userId, endpointId, channel, message, clientIp) {
    const { title, content, type, url } = message;

    // 创建推送记录
    const log = await PushLogModel.create({
      user_id: userId,
      endpoint_id: endpointId,
      channel_id: channel.id,
      channel_type: channel.channel_type,
      title,
      content,
      message_type: type,
      status: 'pending',
      ip: clientIp,
    });

    try {
      // 获取适配器并发送
      const adapter = getChannelAdapter(channel.channel_type, channel.config, channel.id);
      const result = await adapter.send({ title, content, type, url });

      // 更新记录为成功
      await PushLogModel.updateStatus(log.id, 'success', result, null);

      logger.info(`推送成功 - 用户:${userId} 渠道:${channel.channel_type} 渠道ID:${channel.id}`);

      return {
        success: true,
        channelId: channel.id,
        channelType: channel.channel_type,
        channelName: channel.name,
        logId: log.id,
        result,
      };
    } catch (error) {
      // 更新记录为失败
      await PushLogModel.updateStatus(log.id, 'failed', null, error.message);

      logger.error(`推送失败 - 用户:${userId} 渠道:${channel.channel_type} 渠道ID:${channel.id} 错误:${error.message}`);

      return {
        success: false,
        channelId: channel.id,
        channelType: channel.channel_type,
        channelName: channel.name,
        logId: log.id,
        error: error.message,
      };
    }
  }
}

module.exports = PushService;
