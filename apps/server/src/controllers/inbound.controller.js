const InboundService = require('../services/inbound.service');
const PushService = require('../services/push.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');
const getRealIP = require('../utils/ip');

/**
 * 入站控制器
 * 处理外部服务的 Webhook 回调
 */
class InboundController {
  /**
   * 处理入站请求
   * GET/POST /api/inbound/:token
   */
  static async handleInbound(req, res) {
    try {
      // 从 URL 获取 token
      const { token } = req.params;

      if (!token) {
        return ResponseUtil.badRequest(res, '缺少接口令牌');
      }

      // 获取 endpoint（由中间件注入）
      const endpoint = req.endpoint;

      if (!endpoint) {
        return ResponseUtil.notFound(res, '接口不存在或已禁用');
      }

      // 检查是否启用了入站配置
      if (!endpoint.inbound_config?.enabled) {
        return ResponseUtil.badRequest(res, '该接口未启用入站接收功能，请在接口配置中开启');
      }

      // 获取请求数据：POST 从 body 获取，GET 从 query 获取
      let payload;
      if (req.method === 'GET') {
        payload = req.query;
        // 将 query 参数中的特殊字段转换
        if (payload.data) {
          try {
            // 支持传递 JSON 字符串
            payload = JSON.parse(payload.data);
          } catch {
            // 如果不是 JSON，保持原样
          }
        }
      } else {
        payload = req.body;
      }

      // 临时日志：记录完整请求体
      // logger.info(`[Inbound] 完整请求体: ${JSON.stringify(payload, null, 2)}`);

      if (!payload || Object.keys(payload).length === 0) {
        return ResponseUtil.badRequest(res, '请求数据不能为空');
      }

      logger.info(`[Inbound] 收到入站请求: endpoint=${endpoint.name}, token=${token.substring(0, 8)}..., method=${req.method}`);

      // 处理入站数据，转换为标准消息格式
      const message = InboundService.processInbound(endpoint, payload);

      // 执行推送
      const result = await PushService.pushByToken(token, message, getRealIP(req), req.requestId);

      if (result.success) {
        logger.info(`[Inbound] 推送成功: endpoint=${endpoint.name}`);
        return ResponseUtil.success(res, result, '推送成功');
      } else {
        logger.warn(`[Inbound] 部分推送失败: endpoint=${endpoint.name}`);
        return ResponseUtil.error(res, '部分推送失败', 400, 400, result);
      }
    } catch (error) {
      logger.error('[Inbound] 处理失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 测试入站配置
   * POST /api/inbound/:token/test
   */
  static async testInbound(req, res) {
    try {
      const endpoint = req.endpoint;

      if (!endpoint) {
        return ResponseUtil.notFound(res, '接口不存在');
      }

      const payload = req.body;

      if (!payload || Object.keys(payload).length === 0) {
        return ResponseUtil.badRequest(res, '请提供测试数据');
      }

      // 处理入站数据
      const message = InboundService.processInbound(endpoint, payload);

      // 返回解析结果，不实际推送
      return ResponseUtil.success(res, {
        original: payload,
        parsed: message,
      }, '解析成功');
    } catch (error) {
      logger.error('[Inbound] 测试失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}

module.exports = InboundController;
