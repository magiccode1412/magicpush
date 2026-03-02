const db = require('../config/database');

/**
 * 渠道模型
 */
class ChannelModel {
  /**
   * 根据ID查找渠道
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM channels WHERE id = ?');
    const channel = stmt.get(id);
    if (channel) {
      channel.config = JSON.parse(channel.config);
    }
    return channel;
  }

  /**
   * 根据用户ID获取所有渠道
   */
  static findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC');
    const channels = stmt.all(userId);
    return channels.map(channel => ({
      ...channel,
      config: JSON.parse(channel.config),
    }));
  }

  /**
   * 根据用户ID和渠道类型查找
   */
  static findByUserIdAndType(userId, channelType) {
    const stmt = db.prepare('SELECT * FROM channels WHERE user_id = ? AND channel_type = ?');
    const channels = stmt.all(userId, channelType);
    return channels.map(channel => ({
      ...channel,
      config: JSON.parse(channel.config),
    }));
  }

  /**
   * 创建渠道
   */
  static create(channelData) {
    const { user_id, channel_type, name, config, is_active } = channelData;
    const stmt = db.prepare(
      'INSERT INTO channels (user_id, channel_type, name, config, is_active) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      user_id,
      channel_type,
      name,
      JSON.stringify(config),
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );
    return this.findById(result.lastInsertRowid);
  }

  /**
   * 更新渠道
   */
  static update(id, channelData) {
    const fields = [];
    const values = [];

    if (channelData.name !== undefined) {
      fields.push('name = ?');
      values.push(channelData.name);
    }
    if (channelData.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(channelData.config));
    }
    if (channelData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(channelData.is_active ? 1 : 0);
    }

    if (fields.length === 0) return null;

    fields.push("updated_at = datetime('now', 'localtime')");
    values.push(id);

    const stmt = db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * 删除渠道
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM channels WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * 获取用户的渠道统计
   */
  static getStatsByUserId(userId) {
    const stmt = db.prepare(`
      SELECT channel_type, COUNT(*) as count 
      FROM channels 
      WHERE user_id = ? AND is_active = 1
      GROUP BY channel_type
    `);
    return stmt.all(userId);
  }

  /**
   * 根据用户ID和名称查找渠道
   */
  static findByUserIdAndName(userId, name) {
    const stmt = db.prepare('SELECT * FROM channels WHERE user_id = ? AND name = ?');
    const channel = stmt.get(userId, name);
    if (channel) {
      channel.config = JSON.parse(channel.config);
    }
    return channel;
  }
}

module.exports = ChannelModel;
