const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channel.controller');
const authMiddleware = require('../middleware/auth.middleware');
const {
  createChannelValidation,
  updateChannelValidation,
} = require('../middleware/validator.middleware');

// 所有渠道路由都需要认证
router.use(authMiddleware);

// 微信龙虾机器人绑定路由（必须在 /:id 之前，避免路径冲突）
const clawbotRoutes = require('./clawbot.routes');
router.use('/clawbot', clawbotRoutes);

// 获取渠道列表
router.get('/', channelController.getChannels);

// 获取支持的渠道类型
router.get('/types', channelController.getChannelTypes);

// 创建渠道
router.post('/', createChannelValidation, channelController.createChannel);

// 获取单个渠道
router.get('/:id', channelController.getChannel);

// 更新渠道
router.put('/:id', updateChannelValidation, channelController.updateChannel);

// 删除渠道
router.delete('/:id', channelController.deleteChannel);

// 测试渠道
router.post('/:id/test', channelController.testChannel);

module.exports = router;
