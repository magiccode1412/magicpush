const { EndpointModel, ChannelModel, PushLogModel, SettingsModel } = require('../models');
const { getChannelAdapter } = require('./channels');
const KeywordFilterService = require('./keywordFilter.service');
const ContentReplaceService = require('./contentReplace.service');
const DoNotDisturbService = require('./doNotDisturb.service');
const logger = require('../utils/logger');
const { mapWithConcurrency } = require('../utils/concurrency');

// 多渠道推送的最大并发度：并发提速的同时限制瞬时外部连接数
const PUSH_CONCURRENCY = 5;

/**
 * 推送服务
 */
class PushService {
  /**
   * 通过接口令牌推送
   */
  static async pushByToken(token, message, clientIp, requestId) {
    const endpoint = await EndpointModel.findByToken(token);
    if (!endpoint) {
      throw new Error('无效的接口令牌');
    }

    const channels = await this._prepareEndpointPush(endpoint, null, message, clientIp);
    return await this.pushToChannels(endpoint.user_id, endpoint.id, channels, message, clientIp, requestId);
  }

  /**
   * 通过接口ID推送
   */
  static async pushByEndpoint(endpointId, userId, message, clientIp, requestId) {
    const endpoint = await EndpointModel.findById(endpointId);
    if (!endpoint) {
      throw new Error('接口不存在');
    }

    const channels = await this._prepareEndpointPush(endpoint, userId, message, clientIp);
    return await this.pushToChannels(userId, endpoint.id, channels, message, clientIp, requestId);
  }

  /**
   * 校验接口归属/启用状态、关键词过滤，并取绑定渠道。
   * token 推送时 userId 为 null（无需校验归属）；endpoint 推送需 userId 一致。
   * 统一 pushByToken / pushByEndpoint 的公共前置逻辑，避免重复。
   * @returns {Promise<Array>} 接口绑定的渠道列表
   * @private
   */
  static async _prepareEndpointPush(endpoint, userId, message, clientIp) {
    if (userId != null && endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    if (!endpoint.is_active) {
      throw new Error('接口已禁用');
    }

    // 关键词过滤检查
    const filterResult = KeywordFilterService.check(endpoint.keyword_filter, message);
    if (filterResult.blocked) {
      logger.warn(`关键词过滤拦截 - 接口:${endpoint.id} IP:${clientIp} 模式:${filterResult.mode} 命中词:${filterResult.matchedKeyword || '(无)'}`);
      const errorMsg = filterResult.mode === 'whitelist'
        ? '未包含合法内容'
        : '包含不合法内容';
      throw new Error(errorMsg);
    }

    // 内容字符替换：过滤通过后才改，日志与渠道发送均使用替换后内容
    if (endpoint.content_replace?.enabled) {
      const replaced = ContentReplaceService.replace(endpoint.content_replace, message);
      Object.assign(message, replaced);
    }

    await EndpointModel.updateLastUsed(endpoint.id);

    // 获取接口关联的渠道
    const channels = await EndpointModel.getChannels(endpoint.id);
    if (!channels || channels.length === 0) {
      throw new Error('该接口未绑定任何渠道');
    }

    return channels;
  }

  /**
   * 通过渠道ID推送
   */
  static async pushByChannel(channelId, userId, message, clientIp, requestId) {
    const channel = await ChannelModel.findById(channelId);
    if (!channel || channel.user_id !== userId) {
      throw new Error('渠道不存在');
    }

    if (!channel.is_active) {
      throw new Error('渠道已禁用');
    }

    return await this.pushToChannels(userId, null, [channel], message, clientIp, requestId);
  }

  /**
   * 推送到多个渠道
   */
  static async pushToChannels(userId, endpointId, channels, message, clientIp, requestId) {
    const { title, content, type = 'text', url, extraData } = message;

    // 预取接口信息一次，供各渠道的免打扰判断与日志名称复用，避免逐渠道重复查询
    let endpoint;
    if (endpointId) {
      try {
        endpoint = await EndpointModel.findById(endpointId);
      } catch {
        endpoint = null;
      }
    }

    // 并发推送（受限并发度），结果顺序与 channels 一致
    const results = await mapWithConcurrency(channels, PUSH_CONCURRENCY, (channel) =>
      this.pushToChannel(userId, endpointId, channel, { title, content, type, url, extraData }, clientIp, endpoint, requestId)
    );

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
  static async pushToChannel(userId, endpointId, channel, message, clientIp, endpoint, requestId) {
    let { title, content, type, url, extraData } = message;

    // 从 extraData 的渠道命名空间动态获取 channelType（类型与数据自包含设计）
    const nsKey = channel.channel_type;
    let resolvedChannelType = null;
    let resolvedExtraData = null;

    if (extraData && nsKey && extraData[nsKey]) {
      const namespaceData = extraData[nsKey];
      resolvedChannelType = namespaceData.channelType || null;
      resolvedExtraData = namespaceData;
    }

    // 接口信息（免打扰判断 + 日志名称共用一次查询）
    // 调用方（pushToChannels）通常已预取并传入；未传入时按需查询一次，保持独立可调用
    let ep = endpoint;
    if (endpointId && ep === undefined) {
      try {
        ep = await EndpointModel.findById(endpointId);
      } catch {
        ep = null;
      }
    }

    // 消息免打扰检查：如果当前在免打扰时段内，记录日志但不实际推送
    if (endpointId) {
      // 全局开关：关闭时所有免打扰配置不生效
      const globalDndEnabled = SettingsModel.getBoolean('dnd_global_enabled', false);
      if (globalDndEnabled && ep && DoNotDisturbService.shouldMute(ep.do_not_disturb)) {
        const log = await PushLogModel.create({
          user_id: userId,
          endpoint_id: endpointId,
          endpoint_name: ep.name,
          channel_id: channel.id,
          channel_type: channel.channel_type,
          title,
          content,
          message_type: type,
          status: 'skipped_dnd',
          ip: clientIp,
          request_id: requestId,
        });

        logger.info(`推送被免打扰拦截 - 用户:${userId} 接口:${endpointId} 渠道:${channel.channel_type}`);

        return {
          success: false,
          skippedDnd: true,
          channelId: channel.id,
          channelType: channel.channel_type,
          channelName: channel.name,
          logId: log.id,
        };
      }
    }

    // 创建推送记录（接口名称用于日志展示，复用上面已查询的 ep）
    const endpointName = ep ? ep.name : null;
    const log = await PushLogModel.create({
      user_id: userId,
      endpoint_id: endpointId,
      endpoint_name: endpointName,
      channel_id: channel.id,
      channel_type: channel.channel_type,
      title,
      content,
      message_type: type,
      status: 'pending',
      ip: clientIp,
      request_id: requestId,
    });

    try {
      // 获取适配器并发送（传递完整消息对象以支持渠道特有类型）
      const adapter = getChannelAdapter(channel.channel_type, channel.config, channel.id);
      const result = await adapter.send({ title, content, type, url, channelType: resolvedChannelType, extraData: resolvedExtraData });

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
