const db = require('../config/database');

/**
 * 用户模型
 */
class UserModel {
  /**
   * 根据ID查找用户
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * 根据邮箱查找用户
   */
  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  /**
   * 根据用户名查找用户
   */
  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  /**
   * 创建用户
   */
  static create(userData) {
    const { username, email, password, avatar, role } = userData;
    const stmt = db.prepare(
      'INSERT INTO users (username, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(username, email, password, avatar || null, role || 'user');
    return this.findById(result.lastInsertRowid);
  }

  /**
   * 更新用户
   */
  static update(id, userData) {
    const fields = [];
    const values = [];

    if (userData.username !== undefined) {
      fields.push('username = ?');
      values.push(userData.username);
    }
    if (userData.email !== undefined) {
      fields.push('email = ?');
      values.push(userData.email);
    }
    if (userData.password !== undefined) {
      fields.push('password = ?');
      values.push(userData.password);
    }
    if (userData.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(userData.avatar);
    }

    if (fields.length === 0) return null;

    fields.push("updated_at = datetime('now', 'localtime')");
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * 删除用户
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * 获取用户统计信息
   */
  static getStats(userId) {
    const stats = {};

    // 渠道数量
    const channelStmt = db.prepare('SELECT COUNT(*) as count FROM channels WHERE user_id = ?');
    stats.channelCount = channelStmt.get(userId).count;

    // 接口数量
    const endpointStmt = db.prepare('SELECT COUNT(*) as count FROM endpoints WHERE user_id = ?');
    stats.endpointCount = endpointStmt.get(userId).count;

    // 今日推送数量
    const todayPushStmt = db.prepare(`
      SELECT COUNT(*) as count FROM push_logs 
      WHERE user_id = ? AND date(created_at) = date('now', 'localtime')
    `);
    stats.todayPushCount = todayPushStmt.get(userId).count;

    // 总推送数量
    const totalPushStmt = db.prepare('SELECT COUNT(*) as count FROM push_logs WHERE user_id = ?');
    stats.totalPushCount = totalPushStmt.get(userId).count;

    return stats;
  }

  /**
   * 获取用户总数
   */
  static getUserCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    return stmt.get().count;
  }

  /**
   * 获取所有用户列表（支持分页和搜索）
   */
  static findAll({ page = 1, pageSize = 10, keyword = '' } = {}) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    let countWhereClause = '';
    let params = [];

    if (keyword) {
      whereClause = 'WHERE username LIKE ? OR email LIKE ?';
      countWhereClause = 'WHERE username LIKE ? OR email LIKE ?';
      params = [`%${keyword}%`, `%${keyword}%`];
    }

    // 获取总数
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM users ${countWhereClause}`);
    const total = countStmt.get(...params).count;

    // 获取列表
    const stmt = db.prepare(`
      SELECT id, username, email, avatar, role, created_at, updated_at 
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const list = stmt.all(...params, pageSize, offset);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据ID查找用户（管理员用，返回更多信息）
   */
  static findByIdForAdmin(id) {
    const stmt = db.prepare(`
      SELECT id, username, email, avatar, role, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `);
    return stmt.get(id);
  }

  /**
   * 更新用户（管理员用，可更新更多字段）
   */
  static updateByAdmin(id, userData) {
    const fields = [];
    const values = [];

    if (userData.username !== undefined) {
      fields.push('username = ?');
      values.push(userData.username);
    }
    if (userData.email !== undefined) {
      fields.push('email = ?');
      values.push(userData.email);
    }
    if (userData.password !== undefined) {
      fields.push('password = ?');
      values.push(userData.password);
    }
    if (userData.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(userData.avatar);
    }
    if (userData.role !== undefined) {
      fields.push('role = ?');
      values.push(userData.role);
    }

    if (fields.length === 0) return null;

    fields.push("updated_at = datetime('now', 'localtime')");
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findByIdForAdmin(id);
  }

  /**
   * 删除用户
   */
  static deleteById(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = UserModel;
