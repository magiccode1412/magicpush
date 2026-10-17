require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { globalLimiter } = require('./middleware/rateLimit.middleware');
const initDatabase = require('./database/init');
require('./config/version');
const routes = require('./routes');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const retentionService = require('./services/retention.service');
const { registerShutdown } = require('./utils/shutdown');
require('./models');
const clawbotMonitor = require('./services/clawbot/clawbot-monitor');
const yuanbaobotMonitor = require('./services/yuanbaobot/yuanbaobot-monitor');
const qqbotMonitor = require('./services/qqbot/qqbot-monitor');

// 确保日志目录存在
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 解析 TRUST_PROXY 配置（部署契约见 README）：
 * - 不填 / 空        → 默认 1（单反代，信任第 1 跳）
 * - 纯数字字符串     → 数字跳数（0=直连/本地开发；N=反代前还叠了 N-1 个受信代理）
 * - 其他             → 视为逗号分隔的 CIDR/IP 列表（按对端 IP 是否落入受信网段判定，更安全）
 * @param {string} [raw]
 * @returns {number | string[]}
 */
function parseTrustProxy(raw) {
  const v = (raw || '').trim();
  if (!v) return 1;
  if (/^\d+$/.test(v)) return Math.max(0, parseInt(v, 10));
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 真实客户端 IP 由 trust proxy 机制解析为 req.ip；默认信任单反代（跳数 1），
// 可用 TRUST_PROXY 覆盖（数字跳数或 CIDR/IP 列表）。
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// 初始化数据库
initDatabase().catch(err => {
  logger.error('数据库初始化失败:', err);
  process.exit(1);
});

// 中间件
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'http://localhost'
    : true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求关联 ID 中间件（需在请求日志中间件之前，使日志可携带 requestId）
app.use(requestIdMiddleware);

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 临时调试：设置 DEBUG_BODY=true 时打印请求体到终端
  if (process.env.DEBUG_BODY === 'true' && req.body && Object.keys(req.body).length) {
    logger.info(`[DEBUG] Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

// 全局限流
app.use(globalLimiter);

// API路由
app.use('/api', routes);

// 生产环境：提供前端静态文件服务
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(frontendPath));

  // SPA路由fallback - 所有非API请求返回index.html
  app.get('*', (req, res) => {
    // 跳过API路由
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Not Found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404处理
app.use(notFoundMiddleware);

// 全局错误处理
app.use(errorMiddleware);

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`服务器启动成功，监听端口: ${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);

  // 启动 ClawBot 长轮询监控（自动获取 context_token）
  clawbotMonitor.start();

  // 启动元宝 Bot WS 连接监控
  yuanbaobotMonitor.start();

  // 启动 QQ Bot WS 连接监控（用于获取 OpenID 完成绑定）
  qqbotMonitor.start();

  // 启动推送记录保留（retention）定时清理任务
  retentionService.start();

  // 注册 SIGTERM / SIGINT 优雅关闭钩子
  registerShutdown(server);
});

// ── 内存监控 ──────────────────────────────────────────────────
// V8 堆渐进式增长，仅在堆总量 > 50MB 且使用率 > 80% 时告警
const MEMORY_SAMPLE_INTERVAL = 60 * 1000;
const HEAP_MIN_THRESHOLD = 50 * 1024 * 1024; // 50MB
setInterval(() => {
  const mem = process.memoryUsage();
  const usagePercent = mem.heapUsed / mem.heapTotal;

  if (mem.heapTotal > HEAP_MIN_THRESHOLD && usagePercent > 0.8) {
    const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const rssMB = (mem.rss / 1024 / 1024).toFixed(1);
    logger.warn(`内存使用过高: heap ${heapUsedMB}/${heapTotalMB}MB (${(usagePercent * 100).toFixed(1)}%), rss ${rssMB}MB`);
  }
}, MEMORY_SAMPLE_INTERVAL);

module.exports = app;
