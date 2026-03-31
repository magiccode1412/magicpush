const rateLimit = require('express-rate-limit');
const ResponseUtil = require('../utils/response');
const RateLimitConfigService = require('../services/rateLimitConfig.service');
const logger = require('../utils/logger');

// 获取真实 IP
const getRealIP = (req) => {
  const xRealIP = req.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  return req.ip;
};

/**
 * 创建动态限流器工厂函数
 * 每次请求时从数据库读取最新配置
 */
const createDynamicLimiter = (configKey, keyGenerator, message) => {
  return rateLimit({
    windowMs: 60 * 1000,
    max: () => RateLimitConfigService.get(configKey),
    keyGenerator,
    handler: (req, res) => {
      logger.warn('请求被限流', {
        ip: getRealIP(req),
        path: req.path,
        method: req.method,
        configKey,
      });
      return ResponseUtil.tooManyRequests(res, message || '请求过于频繁，请稍后再试');
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// 全局限流器
const globalLimiter = createDynamicLimiter(
  'rate_limit_global_max',
  getRealIP,
  '全局请求过于频繁，请稍后再试'
);

// 登录限流器
const loginLimiter = createDynamicLimiter(
  'rate_limit_login_max',
  getRealIP,
  '登录尝试过于频繁，请 1 分钟后再试'
);

// 注册限流器
const registerLimiter = createDynamicLimiter(
  'rate_limit_register_max',
  getRealIP,
  '注册请求过于频繁，请 1 分钟后再试'
);

// Token 刷新限流器
const refreshLimiter = createDynamicLimiter(
  'rate_limit_refresh_max',
  getRealIP,
  '令牌刷新过于频繁，请稍后再试'
);

// 健康检查限流器
const healthLimiter = createDynamicLimiter(
  'rate_limit_health_max',
  getRealIP,
  '健康检查请求过于频繁'
);

// 推送接口限流器（按 IP）
const pushByIPLimiter = createDynamicLimiter(
  'rate_limit_push_ip_max',
  getRealIP,
  '推送请求过于频繁，请稍后再试'
);

// 推送接口限流器（按 Token）
const pushByTokenLimiter = createDynamicLimiter(
  'rate_limit_push_token_max',
  (req) => req.params.token || req.headers.authorization?.replace('Bearer ', '') || getRealIP(req),
  '该接口令牌请求过于频繁，请稍后再试'
);

// 入站接口限流器（按 Token）
const inboundLimiter = createDynamicLimiter(
  'rate_limit_inbound_max',
  (req) => req.params.token || getRealIP(req),
  '入站请求过于频繁，请稍后再试'
);

module.exports = {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  healthLimiter,
  pushByIPLimiter,
  pushByTokenLimiter,
  inboundLimiter,
};
