const express = require('express');
const router = express.Router();
const pushController = require('../controllers/push.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { pushMessageValidation } = require('../middleware/validator.middleware');
const { pushByIPLimiter, pushByTokenLimiter } = require('../middleware/rateLimit.middleware');

// 通过接口令牌推送（无需认证，通过令牌识别）
// 方式1: Token 在 URL 路径中
router.get('/:token', pushByIPLimiter, pushByTokenLimiter, pushController.pushByToken);
router.post('/:token', pushByIPLimiter, pushByTokenLimiter, pushMessageValidation, pushController.pushByToken);

// 方式2: Token 在 Authorization 头中 (更安全)
router.post('/', pushByIPLimiter, pushByTokenLimiter, pushMessageValidation, pushController.pushByToken);

// 以下路由需要认证
router.use(authMiddleware);

// 通过接口ID推送
router.post('/by-endpoint/:endpointId', pushMessageValidation, pushController.pushByEndpoint);

// 通过渠道ID推送
router.post('/by-channel/:channelId', pushMessageValidation, pushController.pushByChannel);

module.exports = router;
