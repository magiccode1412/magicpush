const TokenUtil = require('../utils/token');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * JWT认证中间件
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized(res, '缺少访问令牌');
    }

    const token = authHeader.substring(7);
    const decoded = TokenUtil.verifyToken(token);

    if (!decoded) {
      return ResponseUtil.unauthorized(res, '访问令牌无效或已过期');
    }

    // 将用户信息附加到请求对象
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('认证中间件错误:', error);
    return ResponseUtil.unauthorized(res, '认证失败');
  }
};

module.exports = authMiddleware;
