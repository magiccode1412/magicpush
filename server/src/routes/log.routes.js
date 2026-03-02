const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validator.middleware');

// 所有日志路由都需要认证
router.use(authMiddleware);

// 获取推送记录列表
router.get('/', paginationValidation, logController.getLogs);

// 获取推送记录详情
router.get('/:id', logController.getLog);

// 获取推送统计
router.get('/stats/overview', logController.getStats);

// 清空推送记录
router.delete('/clear', logController.clearLogs);

module.exports = router;
