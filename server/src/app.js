require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const initDatabase = require('./database/init');
require('./config/version');
const routes = require('./routes');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
require('console');
require('./models');

// 确保日志目录存在
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

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

// 获取真实IP的辅助函数
const getRealIP = (req) => {
  const xRealIP = req.get('X-Real-IP');
  const xForwardedFor = req.get('X-Forwarded-For');

  // 调试日志：获取用户IP
  // logger.info(`xForwardedFor: ${xForwardedFor}`);
  // logger.info(`xRealIP: ${xRealIP}`);
  // logger.info(`req.ip: ${req.ip}`);
  
  if (xForwardedFor) {
    // X-Forwarded-For可能包含多个IP，取第一个
    return xForwardedFor.split(',')[0].trim();
  }
  // 从代理头中获取真实IP
  if (xRealIP) {
    return xRealIP;
  }
  return req.ip;
};

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: getRealIP(req),
    userAgent: req.get('User-Agent'),
  });
  next();
});

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
app.listen(PORT, () => {
  logger.info(`服务器启动成功，监听端口: ${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
