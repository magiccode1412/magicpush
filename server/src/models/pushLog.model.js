const db = require('../config/database');

/**
 * 推送记录模型
 */
class PushLogModel {
  /**
   * 根据ID查找记录
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM push_logs WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * 根据用户ID获取推送记录
   */
  static findByUserId(userId, options = {}) {
    let sql = 'SELECT * FROM push_logs WHERE user_id = ?';
    const params = [userId];

    if (options.endpointId) {
      sql += ' AND endpoint_id = ?';
      params.push(options.endpointId);
    }

    if (options.channelId) {
      sql += ' AND channel_id = ?';
      params.push(options.channelId);
    }

    if (options.channelType) {
      sql += ' AND channel_type = ?';
      params.push(options.channelType);
    }

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options.startDate) {
      sql += ' AND created_at >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      sql += ' AND created_at <= ?';
      params.push(options.endDate);
    }

    // 获取总数
    const countStmt = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total'));
    const { total } = countStmt.get(...params);

    // 排序和分页
    sql += ' ORDER BY created_at DESC';

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const stmt = db.prepare(sql);
    const logs = stmt.all(...params);

    return {
      list: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 创建推送记录
   */
  static create(logData) {
    const {
      user_id,
      endpoint_id,
      channel_id,
      channel_type,
      title,
      content,
      message_type,
      status,
      response,
      error_message,
      ip,
    } = logData;

    const stmt = db.prepare(`
      INSERT INTO push_logs 
      (user_id, endpoint_id, channel_id, channel_type, title, content, message_type, status, response, error_message, ip) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user_id,
      endpoint_id || null,
      channel_id || null,
      channel_type || null,
      title || null,
      content,
      message_type || 'text',
      status,
      response ? JSON.stringify(response) : null,
      error_message || null,
      ip || null
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * 更新推送记录状态
   */
  static updateStatus(id, status, response, errorMessage) {
    const stmt = db.prepare(
      'UPDATE push_logs SET status = ?, response = ?, error_message = ? WHERE id = ?'
    );
    return stmt.run(status, response ? JSON.stringify(response) : null, errorMessage || null, id);
  }

  /**
   * 获取用户推送统计
   */
  static getStats(userId) {
    const stats = {};

    // 总推送数
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM push_logs WHERE user_id = ?');
    stats.total = totalStmt.get(userId).count;

    // 成功数
    const successStmt = db.prepare(
      "SELECT COUNT(*) as count FROM push_logs WHERE user_id = ? AND status = 'success'"
    );
    stats.success = successStmt.get(userId).count;

    // 失败数
    const failedStmt = db.prepare(
      "SELECT COUNT(*) as count FROM push_logs WHERE user_id = ? AND status = 'failed'"
    );
    stats.failed = failedStmt.get(userId).count;

    // 今日推送数
    const todayStmt = db.prepare(
      "SELECT COUNT(*) as count FROM push_logs WHERE user_id = ? AND date(created_at) = date('now', 'localtime')"
    );
    stats.today = todayStmt.get(userId).count;

    // 各渠道推送统计
    const channelStmt = db.prepare(`
      SELECT channel_type, COUNT(*) as count 
      FROM push_logs 
      WHERE user_id = ? AND channel_type IS NOT NULL
      GROUP BY channel_type
    `);
    stats.byChannel = channelStmt.all(userId);

    return stats;
  }

  /**
   * 清理旧记录
   */
  static cleanup(days = 30) {
    const stmt = db.prepare(
      "DELETE FROM push_logs WHERE created_at < datetime('now', 'localtime', ?)"
    );
    return stmt.run(`-${days} days`);
  }

  /**
   * 清空用户所有推送记录
   */
  static deleteByUserId(userId) {
    const stmt = db.prepare('DELETE FROM push_logs WHERE user_id = ?');
    return stmt.run(userId);
  }
}

module.exports = PushLogModel;
