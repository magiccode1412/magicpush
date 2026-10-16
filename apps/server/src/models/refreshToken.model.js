const db = require('../config/database');

/**
 * 刷新令牌模型
 */
class RefreshTokenModel {
  /**
   * 创建刷新令牌
   */
  static create(userId, token, expiresAt) {
    const stmt = db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    );
    return stmt.run(userId, token, expiresAt);
  }

  /**
   * 根据令牌查找
   */
  static findByToken(token) {
    const stmt = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?');
    return stmt.get(token);
  }

  /**
   * 删除指定令牌
   */
  static deleteByToken(token) {
    const stmt = db.prepare('DELETE FROM refresh_tokens WHERE token = ?');
    return stmt.run(token);
  }

  /**
   * 删除用户所有令牌
   */
  static deleteByUserId(userId) {
    const stmt = db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?');
    return stmt.run(userId);
  }

  /**
   * 清理过期令牌
   */
  static cleanup() {
    const stmt = db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now', 'localtime')");
    return stmt.run();
  }
}

module.exports = RefreshTokenModel;
