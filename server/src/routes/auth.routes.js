const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} = require('../middleware/validator.middleware');
const { loginLimiter, registerLimiter, refreshLimiter } = require('../middleware/rateLimit.middleware');

// 检查注册状态（公开接口）
router.get('/registration-status', authController.checkRegistrationStatus);

// 用户注册（限流）
router.post('/register', registerLimiter, registerValidation, authController.register);

// 用户登录（限流）
router.post('/login', loginLimiter, loginValidation, authController.login);

// 刷新令牌（限流）
router.post('/refresh', refreshLimiter, refreshTokenValidation, authController.refreshToken);

// 登出
router.post('/logout', authController.logout);

module.exports = router;
