const db = require('../config/database');

/**
 * 系统设置模型
 */
class SettingsModel {
  /**
   * 根据 key 获取设置值
   * @param {string} key - 设置键名
   * @param {string} defaultValue - 默认值
   * @returns {string|null}
   */
  static get(key, defaultValue = null) {
    const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : defaultValue;
  }

  /**
   * 根据 key 获取布尔值设置
   * @param {string} key - 设置键名
   * @param {boolean} defaultValue - 默认值
   * @returns {boolean}
   */
  static getBoolean(key, defaultValue = false) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
  }

  /**
   * 设置键值对
   * @param {string} key - 设置键名
   * @param {string} value - 设置值
   * @returns {Object}
   */
  static set(key, value) {
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = datetime('now', 'localtime')
    `);
    return stmt.run(key, String(value));
  }

  /**
   * 设置布尔值
   * @param {string} key - 设置键名
   * @param {boolean} value - 布尔值
   * @returns {Object}
   */
  static setBoolean(key, value) {
    return this.set(key, value ? 'true' : 'false');
  }

  /**
   * 获取所有设置
   * @returns {Array}
   */
  static getAll() {
    const stmt = db.prepare('SELECT key, value FROM system_settings');
    return stmt.all();
  }

  /**
   * 删除设置
   * @param {string} key - 设置键名
   * @returns {Object}
   */
  static delete(key) {
    const stmt = db.prepare('DELETE FROM system_settings WHERE key = ?');
    return stmt.run(key);
  }
}

module.exports = SettingsModel;
