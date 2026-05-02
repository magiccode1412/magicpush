const yuanbaobotMonitor = require('../services/yuanbaobot/yuanbaobot-monitor');
const { ChannelModel } = require('../models');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 元宝 Bot 控制器
 *
 * 提供:
 *  1. 绑定状态查询（是否已完成握手）
 *  2. 手动触发绑定流程（引导用户发消息）
 *  3. 测试发送消息
 */
class YuabaobotController {

  /**
   * 查询渠道的绑定状态
   * GET /api/yuanbaobot/bind/:channelId/status
   */
  static async getBindStatus(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const channel = ChannelModel.findById(channelId);

      if (!channel) {
        return ResponseUtil.notFound(res, '渠道不存在');
      }
      if (channel.channel_type !== 'yuanbaobot') {
        return ResponseUtil.badRequest(res, '该渠道不是元宝 Bot 类型');
      }

      const config = typeof channel.config === 'string'
        ? JSON.parse(channel.config)
        : channel.config;

      const bound = !!config.toUserId;

      // 同时检查 WS 连接状态
      let connectionState = 'unknown';
      if (config.appKey) {
        const client = yuanbaobotMonitor.getClient(config.appKey);
        if (client) {
          connectionState = client.getState();
        }
      }

      return ResponseUtil.success(res, {
        bound,
        toUserId: config.toUserId || null,
        senderNickname: config.senderNickname || null,
        connectionState,
      }, bound ? '已绑定' : '等待握手绑定');
    } catch (error) {
      logger.error('查询元宝绑定状态失败:', error.message);
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 手动触发重连 / 重试绑定
   * POST /api/yuanbaobot/bind/:channelId/retry
   */
  static async retryBind(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const channel = ChannelModel.findById(channelId);

      if (!channel) {
        return ResponseUtil.notFound(res, '渠道不存在');
      }
      if (channel.channel_type !== 'yuanbaobot') {
        return ResponseUtil.badRequest(res, '该渠道不是元宝 Bot 类型');
      }

      // 清除已有绑定状态
      const config = typeof channel.config === 'string'
        ? JSON.parse(channel.config)
        : channel.config;

      config.toUserId = '';
      config.senderNickname = '';
      ChannelModel.update(channelId, { config });

      // 重连 WS
      yuanbaobotMonitor.addChannel(channelId);

      logger.info(`[yuanbaobot-controller] 渠道 ${channelId} 触发重连`);

      return ResponseUtil.success(res, {
        message: '已触发重连，请在元宝 App 中给 Bot 发送一条消息完成绑定',
      });
    } catch (error) {
      logger.error('重试元宝绑定失败:', error.message);
      return ResponseUtil.serverError(res, error.message);
    }
  }
}

module.exports = YuabaobotController;
