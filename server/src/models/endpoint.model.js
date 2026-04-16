const db = require('../config/database');

/**
 * 推送接口模型
 */
class EndpointModel {
  /**
   * 根据ID查找接口
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM endpoints WHERE id = ?');
    const endpoint = stmt.get(id);
    if (endpoint) {
      try {
        endpoint.inbound_config = JSON.parse(endpoint.inbound_config);
      } catch (e) {
        endpoint.inbound_config = null;
      }
      try {
        endpoint.keyword_filter = JSON.parse(endpoint.keyword_filter);
      } catch (e) {
        endpoint.keyword_filter = null;
      }
    }
    return endpoint;
  }

  /**
   * 根据令牌查找接口
   */
  static findByToken(token) {
    const stmt = db.prepare('SELECT * FROM endpoints WHERE token = ?');
    const endpoint = stmt.get(token);
    if (endpoint) {
      try {
        endpoint.inbound_config = JSON.parse(endpoint.inbound_config);
      } catch (e) {
        endpoint.inbound_config = null;
      }
      try {
        endpoint.keyword_filter = JSON.parse(endpoint.keyword_filter);
      } catch (e) {
        endpoint.keyword_filter = null;
      }
    }
    return endpoint;
  }

  /**
   * 根据用户ID获取所有接口
   */
  static findByUserId(userId, options = {}) {
    let sql = 'SELECT * FROM endpoints WHERE user_id = ?';
    const params = [userId];

    if (options.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(options.isActive ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = db.prepare(sql);
    const endpoints = stmt.all(...params);

    // 解析每个 endpoint 的 inbound_config 和 keyword_filter
    return endpoints.map(endpoint => {
      if (endpoint.inbound_config) {
        try {
          endpoint.inbound_config = JSON.parse(endpoint.inbound_config);
        } catch (e) {
          endpoint.inbound_config = null;
        }
      }
      if (endpoint.keyword_filter) {
        try {
          endpoint.keyword_filter = JSON.parse(endpoint.keyword_filter);
        } catch (e) {
          endpoint.keyword_filter = null;
        }
      }
      return endpoint;
    });
  }

  /**
   * 创建接口
   */
  static create(endpointData) {
    const { user_id, name, token, description, is_active } = endpointData;
    
    // 如果提供了 token，检查是否已存在
    if (token) {
      const existing = this.findByToken(token);
      if (existing) {
        throw new Error('Token 已存在');
      }
    }
    
    const stmt = db.prepare(
      'INSERT INTO endpoints (user_id, name, token, description, is_active) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      user_id,
      name,
      token,
      description || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );
    return this.findById(result.lastInsertRowid);
  }

  /**
   * 更新接口
   */
  static update(id, endpointData) {
    const fields = [];
    const values = [];

    if (endpointData.name !== undefined) {
      fields.push('name = ?');
      values.push(endpointData.name);
    }
    if (endpointData.description !== undefined) {
      fields.push('description = ?');
      values.push(endpointData.description);
    }
    if (endpointData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(endpointData.is_active ? 1 : 0);
    }
    if (endpointData.token !== undefined) {
      fields.push('token = ?');
      values.push(endpointData.token);
    }
    if (endpointData.inbound_config !== undefined) {
      fields.push('inbound_config = ?');
      values.push(endpointData.inbound_config ? JSON.stringify(endpointData.inbound_config) : null);
    }
    if (endpointData.keyword_filter !== undefined) {
      fields.push('keyword_filter = ?');
      values.push(endpointData.keyword_filter ? JSON.stringify(endpointData.keyword_filter) : null);
    }

    if (fields.length === 0) return null;

    fields.push("updated_at = datetime('now', 'localtime')");
    values.push(id);

    const stmt = db.prepare(`UPDATE endpoints SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * 更新最后使用时间
   */
  static updateLastUsed(id) {
    const stmt = db.prepare("UPDATE endpoints SET last_used_at = datetime('now', 'localtime') WHERE id = ?");
    return stmt.run(id);
  }

  /**
   * 删除接口
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM endpoints WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * 获取接口关联的渠道
   */
  static getChannels(endpointId) {
    const stmt = db.prepare(`
      SELECT c.* FROM channels c
      INNER JOIN endpoint_channels ec ON c.id = ec.channel_id
      WHERE ec.endpoint_id = ? AND c.is_active = 1
    `);
    const channels = stmt.all(endpointId);
    return channels.map(channel => ({
      ...channel,
      config: JSON.parse(channel.config),
    }));
  }

  /**
   * 绑定渠道到接口
   */
  static bindChannel(endpointId, channelId) {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO endpoint_channels (endpoint_id, channel_id) VALUES (?, ?)'
    );
    return stmt.run(endpointId, channelId);
  }

  /**
   * 解绑渠道
   */
  static unbindChannel(endpointId, channelId) {
    const stmt = db.prepare(
      'DELETE FROM endpoint_channels WHERE endpoint_id = ? AND channel_id = ?'
    );
    return stmt.run(endpointId, channelId);
  }

  /**
   * 设置接口渠道（全量替换）
   */
  static setChannels(endpointId, channelIds) {
    const deleteStmt = db.prepare('DELETE FROM endpoint_channels WHERE endpoint_id = ?');
    deleteStmt.run(endpointId);

    if (channelIds && channelIds.length > 0) {
      const insertStmt = db.prepare(
        'INSERT INTO endpoint_channels (endpoint_id, channel_id) VALUES (?, ?)'
      );
      for (const channelId of channelIds) {
        insertStmt.run(endpointId, channelId);
      }
    }
  }

  /**
   * 根据用户ID和名称查找接口
   */
  static findByUserIdAndName(userId, name) {
    const stmt = db.prepare('SELECT * FROM endpoints WHERE user_id = ? AND name = ?');
    return stmt.get(userId, name);
  }

  /**
   * 更新关键词过滤配置
   */
  static updateKeywordFilter(endpointId, filterConfig) {
    const stmt = db.prepare(
      "UPDATE endpoints SET keyword_filter = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    );
    stmt.run(
      filterConfig ? JSON.stringify(filterConfig) : null,
      endpointId
    );
    return this.findById(endpointId);
  }

  /**
   * 获取用户的所有接口-渠道关联（包含渠道名称）
   */
  static getAllEndpointChannels(userId) {
    const stmt = db.prepare(`
      SELECT ec.endpoint_id, ec.channel_id, c.name as channel_name
      FROM endpoint_channels ec
      INNER JOIN endpoints e ON ec.endpoint_id = e.id
      INNER JOIN channels c ON ec.channel_id = c.id
      WHERE e.user_id = ?
    `);
    return stmt.all(userId);
  }
}

module.exports = EndpointModel;
