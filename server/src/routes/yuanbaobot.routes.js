const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const yuanbaobotController = require('../controllers/yuanbaobot.controller');

// 所有路由需要认证
router.use(authenticate);

// 查询绑定状态
router.get('/bind/:channelId/status', yuanbaobotController.getBindStatus);

// 重试绑定
router.post('/bind/:channelId/retry', yuanbaobotController.retryBind);

module.exports = router;
