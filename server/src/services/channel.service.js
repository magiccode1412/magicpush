const { ChannelModel } = require('../models');
const { getChannelAdapter, getChannelTypes, validateChannelConfig } = require('./channels');
const logger = require('../utils/logger');

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
    if (channelData.config !== undefined) {
      // 验证新配置
      const validation = validateChannelConfig(channel.channel_type, channelData.config);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      updateData.config = channelData.config;
    }
    if (channelData.is_active !== undefined) updateData.is_active = channelData.is_active;

    return await ChannelModel.update(id, updateData);
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

    const adapter = getChannelAdapter(channel.channel_type, channel.config);
    return await adapter.test();
  }
}

module.exports = ChannelService;
