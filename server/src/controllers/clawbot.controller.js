const IlinkClient = require('../services/clawbot/ilink-client');
const ChannelService = require('../services/channel.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 微信龙虾机器人绑定控制器
 */
class ClawbotController {
  /**
   * 获取绑定二维码
   */
  static async getQRCode(req, res) {
    try {
      const client = new IlinkClient({});
      const result = await client.getQRCode();
      return ResponseUtil.success(res, result, '获取二维码成功');
    } catch (error) {
      logger.error('获取 ClawBot 二维码失败:', error.message);
      return ResponseUtil.serverError(res, '获取二维码失败: ' + error.message);
    }
  }

  /**
   * 轮询扫码状态
   */
  static async getQRStatus(req, res) {
    try {
      const { qrcode } = req.query;
      if (!qrcode) {
        return ResponseUtil.badRequest(res, 'qrcode 参数不能为空');
      }
      const client = new IlinkClient({});
      const result = await client.pollQRStatus(qrcode);
      return ResponseUtil.success(res, result);
    } catch (error) {
      logger.error('轮询 ClawBot 扫码状态失败:', error.message);
      return ResponseUtil.serverError(res, '查询扫码状态失败: ' + error.message);
    }
  }

  /**
   * 确认绑定 —— 创建渠道
   */
  static async bindChannel(req, res) {
    try {
      const { token, botId, userId, baseUrl } = req.body;
      if (!token || !userId) {
        return ResponseUtil.badRequest(res, '绑定信息不完整，缺少 token 或 userId');
      }

      const channel = await ChannelService.createChannel(req.user.userId, {
        channelType: 'wechatclawbot',
        name: '微信龙虾机器人',
        config: {
          token,
          toUserId: userId,
          botId: botId || '',
          baseUrl: baseUrl || 'https://ilinkai.weixin.qq.com',
        },
      });

      return ResponseUtil.created(res, channel, '绑定成功');
    } catch (error) {
      logger.error('ClawBot 绑定创建渠道失败:', error.message);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 重新绑定 —— 更新已有渠道的 token 和 userId
   */
  static async rebindChannel(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const { token, botId, userId, baseUrl } = req.body;
      if (!token || !userId) {
        return ResponseUtil.badRequest(res, '绑定信息不完整，缺少 token 或 userId');
      }

      const channel = await ChannelService.updateChannel(channelId, req.user.userId, {
        config: {
          token,
          toUserId: userId,
          botId: botId || '',
          baseUrl: baseUrl || 'https://ilinkai.weixin.qq.com',
        },
      });

      return ResponseUtil.success(res, channel, '重新绑定成功');
    } catch (error) {
      if (error.message === '渠道不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('ClawBot 重新绑定失败:', error.message);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}

module.exports = ClawbotController;
