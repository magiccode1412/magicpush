const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} = require('../middleware/validator.middleware');

// 检查注册状态（公开接口）
router.get('/registration-status', authController.checkRegistrationStatus);

// 用户注册
router.post('/register', registerValidation, authController.register);

// 用户登录
router.post('/login', loginValidation, authController.login);

// 刷新令牌
router.post('/refresh', refreshTokenValidation, authController.refreshToken);

// 登出
router.post('/logout', authController.logout);

module.exports = router;
