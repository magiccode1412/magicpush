const express = require('express');
const router = express.Router();
const clawbotController = require('../controllers/clawbot.controller');

// 获取绑定二维码
router.post('/bind/qrcode', clawbotController.getQRCode);

// 轮询扫码状态
router.get('/bind/status', clawbotController.getQRStatus);

// 确认绑定并创建渠道
router.post('/bind/confirm', clawbotController.bindChannel);

// 重新绑定已有渠道
router.put('/bind/:channelId/rebind', clawbotController.rebindChannel);

// 检查 context_token 是否就绪
router.get('/bind/:channelId/context-status', clawbotController.checkContextStatus);

module.exports = router;
