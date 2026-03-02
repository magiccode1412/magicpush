const PushService = require('../services/push.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 推送控制器
 */
class PushController {
  /**
   * 通过接口令牌推送
   */
  static async pushByToken(req, res) {
    try {
      // 支持从 URL 路径或 Authorization 头获取 token
      let { token } = req.params;
      if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return ResponseUtil.badRequest(res, '缺少接口令牌');
      }

      // 支持 POST body 或 GET query 参数
      const { title, content, type = 'text' } = req.method === 'GET' ? req.query : req.body;

      // 获取真实IP
      const getRealIP = (req) => {
        const xRealIP = req.get('X-Real-IP');
        if (xRealIP) return xRealIP;
        const xForwardedFor = req.get('X-Forwarded-For');
        if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
        return req.ip;
      };

      const result = await PushService.pushByToken(token, { title, content, type }, getRealIP(req));

      if (result.success) {
        return ResponseUtil.success(res, result, '推送成功');
      } else {
        return ResponseUtil.error(res, '部分推送失败', 400, 400, result);
      }
    } catch (error) {
      logger.error('推送失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 通过接口ID推送
   */
  static async pushByEndpoint(req, res) {
    try {
      const endpointId = parseInt(req.params.endpointId);
      const { title, content, type = 'text' } = req.body;

      // 获取真实IP
      const getRealIP = (req) => {
        const xRealIP = req.get('X-Real-IP');
        if (xRealIP) return xRealIP;
        const xForwardedFor = req.get('X-Forwarded-For');
        if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
        return req.ip;
      };

      const result = await PushService.pushByEndpoint(
        endpointId,
        req.user.userId,
        { title, content, type },
        getRealIP(req)
      );

      if (result.success) {
        return ResponseUtil.success(res, result, '推送成功');
      } else {
        return ResponseUtil.error(res, '部分推送失败', 400, 400, result);
      }
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('推送失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 通过渠道ID推送
   */
  static async pushByChannel(req, res) {
    try {
      const channelId = parseInt(req.params.channelId);
      const { title, content, type = 'text' } = req.body;

      // 获取真实IP
      const getRealIP = (req) => {
        const xRealIP = req.get('X-Real-IP');
        if (xRealIP) return xRealIP;
        const xForwardedFor = req.get('X-Forwarded-For');
        if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
        return req.ip;
      };

      const result = await PushService.pushByChannel(
        channelId,
        req.user.userId,
        { title, content, type },
        getRealIP(req)
      );

      if (result.success) {
        return ResponseUtil.success(res, result, '推送成功');
      } else {
        return ResponseUtil.error(res, '推送失败', 400, 400, result);
      }
    } catch (error) {
      if (error.message === '渠道不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('推送失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}

module.exports = PushController;
