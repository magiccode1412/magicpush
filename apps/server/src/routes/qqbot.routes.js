const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const qqbotController = require('../controllers/qqbot.controller');

// 所有路由需要认证
router.use(authenticate);

// 查询绑定状态
router.get('/bind/:channelId/status', qqbotController.getBindStatus);

// 启动绑定（新建渠道时建立 WS 连接）
router.post('/bind/:channelId/start', qqbotController.startBinding);

// 重试绑定
router.post('/bind/:channelId/retry', qqbotController.retryBind);

module.exports = router;
