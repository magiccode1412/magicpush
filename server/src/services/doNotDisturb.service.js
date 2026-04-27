const logger = require('../utils/logger');

/**
 * 消息免打扰服务 - 判断当前时间是否在免打扰时间段内
 */
class DoNotDisturbService {
  /**
   * 判断当前时间是否在免打扰时间段内（应该拦截推送）
   * @param {Object|null} config - { enabled: boolean, timeRanges: [{ start: 'HH:mm', end: 'HH:mm' }] }
   * @returns {boolean} true = 在免打扰时段内，应拦截；false = 不在时段内，正常放行
   */
  static shouldMute(config) {
    if (!config || !config.enabled || !Array.isArray(config.timeRanges) || config.timeRanges.length === 0) {
      return false;
    }

    const now = this._getMinutesOfDay(new Date());

    return config.timeRanges.some((range) => {
      const start = this._timeToMinutes(range.start);
      const end = this._timeToMinutes(range.end);

      if (start === null || end === null) return false;
      // 开始和结束时间相同视为无效配置，跳过
      if (start === end) return false;

      if (start < end) {
        // 不跨天: 如 09:00 ~ 18:00
        return now >= start && now < end;
      } else {
        // 跨天: 如 22:00 ~ 08:00
        return now >= start || now < end;
      }
    });
  }

  /**
   * 将 "HH:mm" 格式转换为当天的分钟数 (0~1439)
   * @param {string} timeStr - 时间字符串，如 "22:00"
   * @returns {number|null} 分钟数，格式无效返回 null
   */
  static _timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  /**
   * 获取当前时间在当天中的分钟数 (0~1439)
   * @param {Date} date - 日期对象
   * @returns {number} 分钟数
   */
  static _getMinutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  /**
   * 校验免打扰配置是否合法
   * @param {Object} config - { enabled, timeRanges }
   * @returns {{ valid: boolean, error: string|null }}
   */
  static validateConfig(config) {
    if (!config) {
      return { valid: true, error: null }; // 空配置 = 关闭，合法
    }

    if (!Array.isArray(config.timeRanges)) {
      return { valid: false, error: 'timeRanges 必须是数组' };
    }

    if (config.timeRanges.length > 5) {
      return { valid: false, error: '最多支持 5 个时间段' };
    }

    for (let i = 0; i < config.timeRanges.length; i++) {
      const range = config.timeRanges[i];
      if (!range.start || !range.end) {
        return { valid: false, error: `第 ${i + 1} 个时间段缺少开始或结束时间` };
      }
      const start = this._timeToMinutes(range.start);
      const end = this._timeToMinutes(range.end);
      if (start === null || end === null) {
        return { valid: false, error: `第 ${i + 1} 个时间段格式错误，应为 HH:mm` };
      }
    }

    return { valid: true, error: null };
  }
}

module.exports = DoNotDisturbService;
