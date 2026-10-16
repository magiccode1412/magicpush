const qqbotMonitor = require('../services/qqbot/qqbot-monitor');
const { ChannelModel } = require('../models');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * QQ Bot 控制器
 *
 * 提供:
 *  1. 绑定状态查询（是否已获取到 OpenID）
 *  2. 手动触发绑定流程（引导用户在QQ中@机器人）
 *  3. 测试发送消息
 */
class QqbotController {

  /**
   * 查询渠道的绑定状态
   * GET /api/qqbot/bind/:channelId/status
   */
  static async getBindStatus(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const channel = ChannelModel.findById(channelId);

      if (!channel) {
        return ResponseUtil.notFound(res, '渠道不存在');
      }
      if (channel.channel_type !== 'qqbot') {
        return ResponseUtil.badRequest(res, '该渠道不是 QQBot 类型');
      }

      const config = typeof channel.config === 'string'
        ? JSON.parse(channel.config)
        : channel.config;

      const bound = !!config.targetId;

      // 同时检查 WS 连接状态
      let connectionState = 'unknown';
      if (config.appId) {
        const client = qqbotMonitor.getClient(config.appId);
        if (client) {
          connectionState = client.getState();
        }
      }

      return ResponseUtil.success(res, {
        bound,
        targetId: config.targetId || null,
        targetIdDisplay: config.targetId ? `${config.targetId.substring(0, 16)}...` : null,
        msgType: config.msgType || null,
        senderNickname: config.senderNickname || null,
        memberOpenid: config.memberOpenid || null,
        sourceGuildId: config.sourceGuildId || null,
        connectionState,
        botInfo: qqbotMonitor.getClient(config.appId)?.getBotId()
          ? { id: qqbotMonitor.getClient(config.appId).getBotId() }
          : null,
      }, bound ? '已绑定' : '等待在QQ中@机器人或发消息');
    } catch (error) {
      logger.error('查询QQBot绑定状态失败:', error.message);
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 手动触发重连 / 重试绑定
   * POST /api/qqbot/bind/:channelId/retry
   */
  static async retryBind(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const channel = ChannelModel.findById(channelId);

      if (!channel) {
        return ResponseUtil.notFound(res, '渠道不存在');
      }
      if (channel.channel_type !== 'qqbot') {
        return ResponseUtil.badRequest(res, '该渠道不是 QQBot 类型');
      }

      // 清除已有绑定状态，让用户重新走握手流程
      const config = typeof channel.config === 'string'
        ? JSON.parse(channel.config)
        : channel.config;

      config.targetId = '';
      config.memberOpenid = '';
      config.senderNickname = '';
      // 注意：保留 appId、token(clientSecret)、msgType 等配置不变

      ChannelModel.update(channelId, { config });

      // 重连 WS（会自动触发新的 Identify 流程）
      qqbotMonitor.addChannel(channelId);

      logger.info(`[qqbot-controller] 渠道 ${channelId} 触发重连`);

      return ResponseUtil.success(res, {
        message: '已触发重连，请在QQ中 @机器人 或给机器人发一条消息完成绑定',
      });
    } catch (error) {
      logger.error('重试QQBot绑定失败:', error.message);
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 启动绑定流程（为新建渠道建立 WS 连接）
   * POST /api/qqbot/bind/:channelId/start
   */
  static async startBinding(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const channel = ChannelModel.findById(channelId);

      if (!channel) {
        return ResponseUtil.notFound(res, '渠道不存在');
      }
      if (channel.channel_type !== 'qqbot') {
        return ResponseUtil.badRequest(res, '该渠道不是 QQBot 类型');
      }

      // 为该渠道建立 WS 连接（如果尚未建立）
      qqbotMonitor.addChannel(channelId);

      logger.info(`[qqbot-controller] 渠道 ${channelId} 启动绑定流程`);

      return ResponseUtil.success(res, {
        message: '正在建立 WebSocket 连接，请等待...',
      });
    } catch (error) {
      logger.error('启动QQBot绑定失败:', error.message);
      return ResponseUtil.serverError(res, error.message);
    }
  }
}

module.exports = QqbotController;
