const SettingsModel = require('../models/settings.model');

// 限流开关配置键
const ENABLED_KEY = 'rate_limit_enabled';

// 默认配置
const DEFAULTS = {
  rate_limit_global_max: 200,
  rate_limit_login_max: 5,
  rate_limit_register_max: 3,
  rate_limit_refresh_max: 10,
  rate_limit_health_max: 10,
  rate_limit_push_ip_max: 30,
  rate_limit_push_token_max: 60,
  rate_limit_inbound_max: 60,
};

// 配置边界
const BOUNDS = {
  rate_limit_global_max: { min: 10, max: 1000 },
  rate_limit_login_max: { min: 1, max: 20 },
  rate_limit_register_max: { min: 1, max: 10 },
  rate_limit_refresh_max: { min: 1, max: 30 },
  rate_limit_health_max: { min: 1, max: 60 },
  rate_limit_push_ip_max: { min: 1, max: 100 },
  rate_limit_push_token_max: { min: 1, max: 200 },
  rate_limit_inbound_max: { min: 1, max: 200 },
};

class RateLimitConfigService {
  /**
   * 获取单个配置值（带回退到默认值）
   */
  static get(key) {
    const value = SettingsModel.get(key);
    if (value !== null) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        const bounds = BOUNDS[key];
        if (bounds) {
          return Math.max(bounds.min, Math.min(bounds.max, num));
        }
        return num;
      }
    }
    return DEFAULTS[key];
  }

  /**
   * 获取所有配置
   */
  static getAll() {
    const config = {};
    for (const key of Object.keys(DEFAULTS)) {
      config[key] = this.get(key);
    }
    return config;
  }

  /**
   * 获取默认值
   */
  static getDefaults() {
    return { ...DEFAULTS };
  }

  /**
   * 获取配置边界
   */
  static getBounds() {
    return { ...BOUNDS };
  }

  /**
   * 设置配置值（带边界校验）
   */
  static set(key, value) {
    const bounds = BOUNDS[key];
    if (!bounds) {
      throw new Error(`未知的配置项: ${key}`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error('配置值必须是数字');
    }
    const clampedValue = Math.max(bounds.min, Math.min(bounds.max, num));
    SettingsModel.set(key, clampedValue);
    return clampedValue;
  }

  /**
   * 批量设置配置
   */
  static setMany(config) {
    const results = {};
    for (const [key, value] of Object.entries(config)) {
      if (DEFAULTS[key] !== undefined) {
        results[key] = this.set(key, value);
      }
    }
    return results;
  }

  /**
   * 重置为默认值
   */
  static reset() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      SettingsModel.set(key, value);
    }
    return this.getAll();
  }

  /**
   * 获取限流是否启用（默认启用）
   */
  static isEnabled() {
    const value = SettingsModel.get(ENABLED_KEY);
    if (value === null) return true;
    return value === 'true' || value === '1';
  }

  /**
   * 设置限流开关状态
   */
  static setEnabled(enabled) {
    SettingsModel.setBoolean(ENABLED_KEY, !!enabled);
    return this.isEnabled();
  }
}

module.exports = RateLimitConfigService;
