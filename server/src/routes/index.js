const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const versionRoutes = require('./version.routes');
const userRoutes = require('./user.routes');
const channelRoutes = require('./channel.routes');
const endpointRoutes = require('./endpoint.routes');
const pushRoutes = require('./push.routes');
const inboundRoutes = require('./inbound.routes');
const logRoutes = require('./log.routes');
const adminRoutes = require('./admin.routes');
const authenticate = require('../middleware/auth.middleware');
const { healthLimiter } = require('../middleware/rateLimit.middleware');
const logger = require('../utils/logger');
const db = require('../config/database');
const { UserModel, SettingsModel } = require('../models');
const { getVersion, getDisplayName } = require('../config/version');

// 健康检查接口（公开接口，限流）
router.get('/health', healthLimiter, (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'ok';
  let dbError = null;
  let hasAdminUser = false;
  let registrationEnabled = true;

  try {
    // 检查数据库连接
    db.prepare('SELECT 1').get();

    // 检查是否有管理员用户（首位注册用户）
    const userCount = UserModel.getUserCount();
    hasAdminUser = userCount > 0;

    // 检查注册开关
    registrationEnabled = SettingsModel.getBoolean('registration_enabled', true);
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
    logger.error('Health check 数据库检查失败:', error);
  }

  const responseTime = Date.now() - startTime;

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    version: getVersion(),
    name: getDisplayName(),
    database: {
      status: dbStatus,
      error: dbError,
    },
    system: {
      hasAdminUser,
      registrationEnabled,
      userCount: hasAdminUser ? UserModel.getUserCount() : 0,
    },
    responseTime,
  });
});

// 版本信息（公开接口）
router.use('/version', versionRoutes);

// 认证相关路由
router.use('/auth', authRoutes);

// 用户相关路由
router.use('/users', userRoutes);

// 渠道相关路由
router.use('/channels', channelRoutes);

// 接口相关路由
router.use('/endpoints', endpointRoutes);

// 推送相关路由
router.use('/push', pushRoutes);

// 入站接收路由
router.use('/inbound', inboundRoutes);

// 日志相关路由
router.use('/logs', logRoutes);

// 管理员路由（需要认证）
router.use('/admin', authenticate, adminRoutes);

module.exports = router;
