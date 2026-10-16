const { ChannelModel } = require('../models');
const { getChannelAdapter, getChannelTypes, validateChannelConfig } = require('./channels');
const logger = require('../utils/logger');

// 延迟加载（避免循环依赖）
let _yuanbaobotMonitor;
function getYuabaobotMonitor() {
  if (!_yuanbaobotMonitor) _yuanbaobotMonitor = require('./yuanbaobot/yuanbaobot-monitor');
  return _yuanbaobotMonitor;
}

/**
 * 渠道服务
 */
class ChannelService {
  /**
   * 获取渠道列表
   */
  static async getChannels(userId) {
    return await ChannelModel.findByUserId(userId);
  }

  /**
   * 获取渠道类型列表
   */
  static getChannelTypes() {
    return getChannelTypes();
  }

  /**
   * 获取单个渠道
   */
  static async getChannel(id, userId) {
    const channel = await ChannelModel.findById(id);
    if (!channel || channel.user_id !== userId) {
      throw new Error('渠道不存在');
    }
    return channel;
  }

  /**
   * 创建渠道
   */
  static async createChannel(userId, channelData) {
    const { channelType, name, config } = channelData;

    // 验证配置
    const validation = validateChannelConfig(channelType, config);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const channel = await ChannelModel.create({
      user_id: userId,
      channel_type: channelType,
      name,
      config,
      is_active: true,
    });

    logger.info(`用户 ${userId} 创建了渠道: ${name} (${channelType})`);

    // 元宝 Bot 类型需要立即建立 WS 连接
    if (channelType === 'yuanbaobot') {
      try {
        getYuabaobotMonitor().addChannel(channel.id);
        logger.info(`[channel-service] 已触发元宝 Bot 渠道 ${channel.id} WS 连接`);
      } catch (e) {
        logger.warn(`[channel-service] 触发元宝 Bot WS 连接失败（不影响创建）:`, e.message);
      }
    }

    return channel;
  }

  /**
   * 更新渠道
   */
  static async updateChannel(id, userId, channelData) {
    const channel = await ChannelModel.findById(id);
    if (!channel || channel.user_id !== userId) {
      throw new Error('渠道不存在');
    }

    const updateData = {};
    if (channelData.name !== undefined) updateData.name = channelData.name;
    let needReconnect = false;
    if (channelData.config !== undefined) {
      // 验证新配置
      const validation = validateChannelConfig(channel.channel_type, channelData.config);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      updateData.config = channelData.config;

      // 元宝 Bot 类型：检测 appKey / appSecret 是否变化
      if (channel.channel_type === 'yuanbaobot') {
        const oldConfig = typeof channel.config === 'string' ? JSON.parse(channel.config) : channel.config;
        const newConfig = channelData.config;
        if (oldConfig.appKey !== newConfig.appKey || oldConfig.appSecret !== newConfig.appSecret) {
          needReconnect = true;
          logger.info(`[channel-service] 检测到元宝 Bot 渠道 ${id} 凭证变化, 将触发 WS 重连`);
        }
      }
    }
    if (channelData.is_active !== undefined) updateData.is_active = channelData.is_active;

    const result = await ChannelModel.update(id, updateData);

    // 凭证变更 -> 断开旧连接并重新建立
    if (needReconnect) {
      try {
        getYuabaobotMonitor().removeChannel(id);
        getYuabaobotMonitor().addChannel(id);
      } catch (e) {
        logger.warn(`[channel-service] 元宝 Bot 重连失败（不影响更新）:`, e.message);
      }
    }

    return result;
  }

  /**
   * 删除渠道
   */
  static async deleteChannel(id, userId) {
    const channel = await ChannelModel.findById(id);
    if (!channel || channel.user_id !== userId) {
      throw new Error('渠道不存在');
    }

    await ChannelModel.delete(id);
    logger.info(`用户 ${userId} 删除了渠道: ${channel.name}`);

    // 元宝 Bot 类型需要断开 WS 连接
    if (channel.channel_type === 'yuanbaobot') {
      try {
        getYuabaobotMonitor().removeChannel(id);
        logger.info(`[channel-service] 已清理元宝 Bot 渠道 ${id} WS 连接`);
      } catch (e) {
        logger.warn(`[channel-service] 清理元宝 Bot WS 连接失败（不影响删除）:`, e.message);
      }
    }

    return true;
  }

  /**
   * 测试渠道
   */
  static async testChannel(id, userId) {
    const channel = await ChannelModel.findById(id);
    if (!channel || channel.user_id !== userId) {
      throw new Error('渠道不存在');
    }

    if (!channel.is_active) {
      throw new Error('渠道已禁用');
    }

    const adapter = getChannelAdapter(channel.channel_type, channel.config, channel.id);
    return await adapter.test();
  }
}

module.exports = ChannelService;
