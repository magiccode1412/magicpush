/**
 * 小爱音箱渠道路由
 *
 * 提供扫码登录、绑定确认等接口
 * 所有接口均需 JWT 认证
 */

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validator.middleware');
const misoundController = require('../controllers/misound.controller');

// 所有小爱音箱路由都需要认证
router.use(authMiddleware);

// 初始化扫码登录（获取二维码）
router.post('/qr/init', misoundController.initQRLogin);

// 轮询扫码状态（长轮询等待用户扫码）
router.get('/qr/status', misoundController.pollQRStatus);

// 确认绑定（创建渠道）- 需要参数验证
const confirmBindValidation = [
  body('userId').trim().notEmpty().withMessage('userId 不能为空'),
  body('passToken').trim().notEmpty().withMessage('passToken 不能为空'),
  body('did').trim().notEmpty().withMessage('设备名称不能为空'),
  handleValidationErrors,
];
router.post('/qr/confirm', confirmBindValidation, misoundController.confirmBind);

// 重新绑定已有渠道 - 需要参数验证
const rebindValidation = [
  param('channelId').isInt().withMessage('渠道 ID 必须是整数'),
  body('userId').trim().notEmpty().withMessage('userId 不能为空'),
  body('passToken').trim().notEmpty().withMessage('passToken 不能为空'),
  handleValidationErrors,
];
router.put('/qr/:channelId/rebind', rebindValidation, misoundController.rebindChannel);

module.exports = router;
