const express = require('express');
const router = express.Router();
const inboundController = require('../controllers/inbound.controller');
const EndpointModel = require('../models/endpoint.model');
const logger = require('../utils/logger');
const { inboundLimiter } = require('../middleware/rateLimit.middleware');

/**
 * 中间件：验证 token 并加载 endpoint
 */
async function loadEndpoint(req, res, next) {
  try {
    const { token } = req.params;

    // 调试日志
    logger.info(`[Inbound] 收到请求: method=${req.method}, token=${token}`);

    if (!token) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '缺少接口令牌',
      });
    }

    // 查找 endpoint
    const endpoint = EndpointModel.findByToken(token);

    // 调试日志
    logger.info(`[Inbound] 查询结果: ${endpoint ? `找到 endpoint id=${endpoint.id}` : '未找到'}`);

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '接口不存在',
      });
    }

    if (!endpoint.is_active) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '接口已禁用',
      });
    }

    // 解析 inbound_config（如果还是字符串）
    if (endpoint.inbound_config && typeof endpoint.inbound_config === 'string') {
      try {
        endpoint.inbound_config = JSON.parse(endpoint.inbound_config);
      } catch (e) {
        endpoint.inbound_config = null;
      }
    }

    // 注入到 req
    req.endpoint = endpoint;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: 500,
      message: '服务器错误',
    });
  }
}

// 入站接收接口（支持 GET 和 POST）
router.get('/:token', inboundLimiter, loadEndpoint, inboundController.handleInbound);
router.post('/:token', inboundLimiter, loadEndpoint, inboundController.handleInbound);

// 测试入站配置（需要认证，在认证路由中处理）
router.post('/:token/test', loadEndpoint, inboundController.testInbound);

module.exports = router;
