const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// 延迟加载，避免循环依赖
let _jwtSecret = null;

/**
 * 获取 JWT 密钥
 * 优先级：环境变量 > 数据库存储 > 自动生成
 */
function getJwtSecret() {
  // 优先使用环境变量
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // 返回缓存的密钥
  if (_jwtSecret) {
    return _jwtSecret;
  }

  // 从数据库获取或生成新密钥
  try {
    const db = require('../config/database');
    const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
    const result = stmt.get('jwt_secret');

    if (result && result.value) {
      _jwtSecret = result.value;
      return _jwtSecret;
    }

    // 生成新的安全密钥（64字节 = 128位十六进制字符）
    _jwtSecret = crypto.randomBytes(64).toString('hex');

    // 存储到数据库
    const insertStmt = db.prepare(`
      INSERT INTO system_settings (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    insertStmt.run('jwt_secret', _jwtSecret);

    return _jwtSecret;
  } catch (error) {
    // 数据库未初始化时，生成临时密钥（仅用于初始化阶段）
    if (!_jwtSecret) {
      _jwtSecret = crypto.randomBytes(64).toString('hex');
    }
    return _jwtSecret;
  }
}

class TokenUtil {
  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, getJwtSecret(), {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(payload) {
    return jwt.sign(
      { ...payload, jti: uuidv4() },
      getJwtSecret(),
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  /**
   * 生成双令牌
   */
  static generateTokens(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(ACCESS_TOKEN_EXPIRES_IN),
    };
  }

  /**
   * 验证令牌
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, getJwtSecret());
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析令牌（不验证）
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * 解析过期时间
   */
  static parseExpiresIn(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认15分钟

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }
}

module.exports = TokenUtil;
