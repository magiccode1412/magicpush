const rateLimit = require('express-rate-limit');
const ResponseUtil = require('../utils/response');
const RateLimitConfigService = require('../services/rateLimitConfig.service');
const logger = require('../utils/logger');

// ── 限流日志采样 ────────────────────────────────────────────────
// 高频攻击时避免日志被刷屏，同一 IP 在同一分钟内仅记录首次限流
const rateLimitLogCache = new Map();
const RATE_LOG_TTL = 60 * 1000; // 60 秒内同一 IP 不重复记录

setInterval(() => {
  rateLimitLogCache.clear();
}, RATE_LOG_TTL);

/**
 * 创建动态限流器工厂函数
 * 每次请求时从数据库读取最新配置
 * 不传 keyGenerator 时，库自动使用 req.ip（配合 app trust proxy 可获取真实 IP）
 */
const createDynamicLimiter = (configKey, options = {}, message) => {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: () => RateLimitConfigService.get(configKey),
    handler: (req, res) => {
      const logKey = `${req.ip}:${configKey}`;
      if (!rateLimitLogCache.has(logKey)) {
        logger.warn('请求被限流', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          configKey,
        });
        rateLimitLogCache.set(logKey, true);
      }
      return ResponseUtil.tooManyRequests(res, message || '请求过于频繁，请稍后再试');
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });

  // 包装限流器：当限流被禁用时直接跳过
  return (req, res, next) => {
    if (!RateLimitConfigService.isEnabled()) {
      return next();
    }
    return limiter(req, res, next);
  };
};

// 按 IP 限流的限流器（使用库内置 IPv6 安全的 keyGenerator）
const globalLimiter = createDynamicLimiter(
  'rate_limit_global_max',
  {},
  '全局请求过于频繁，请稍后再试'
);

const loginLimiter = createDynamicLimiter(
  'rate_limit_login_max',
  {},
  '登录尝试过于频繁，请 1 分钟后再试'
);

const registerLimiter = createDynamicLimiter(
  'rate_limit_register_max',
  {},
  '注册请求过于频繁，请 1 分钟后再试'
);

const refreshLimiter = createDynamicLimiter(
  'rate_limit_refresh_max',
  {},
  '令牌刷新过于频繁，请稍后再试'
);

const healthLimiter = createDynamicLimiter(
  'rate_limit_health_max',
  {},
  '健康检查请求过于频繁'
);

const pushByIPLimiter = createDynamicLimiter(
  'rate_limit_push_ip_max',
  {},
  '推送请求过于频繁，请稍后再试'
);

// 按 Token 限流（keyGenerator 仅基于 token，不涉及 IP）
const pushByTokenLimiter = createDynamicLimiter(
  'rate_limit_push_token_max',
  {
    keyGenerator: (req) => req.params.token || req.headers.authorization?.replace('Bearer ', '') || 'unknown',
  },
  '该接口令牌请求过于频繁，请稍后再试'
);

const inboundLimiter = createDynamicLimiter(
  'rate_limit_inbound_max',
  {
    keyGenerator: (req) => req.params.token || 'unknown',
  },
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
