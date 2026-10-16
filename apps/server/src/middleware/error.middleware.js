const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');
const getRealIP = require('../utils/ip');

/**
 * 全局错误处理中间件
 */
const errorMiddleware = (err, req, res, _next) => {
  // 记录错误日志
  logger.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method,
    ip: getRealIP(req),
  });

  // 处理特定类型的错误
  if (err.name === 'ValidationError') {
    return ResponseUtil.badRequest(res, err.message);
  }

  if (err.name === 'UnauthorizedError') {
    return ResponseUtil.unauthorized(res, '未授权访问');
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return ResponseUtil.badRequest(res, '数据已存在');
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return ResponseUtil.badRequest(res, '关联数据不存在');
  }

  // 默认服务器错误响应
  const message = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误';

  return ResponseUtil.serverError(res, message);
};

/**
 * 404处理中间件
 */
const notFoundMiddleware = (req, res) => {
  ResponseUtil.notFound(res, `路径 ${req.originalUrl} 不存在`);
};

module.exports = {
  errorMiddleware,
  notFoundMiddleware,
};
