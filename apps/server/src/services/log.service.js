const { PushLogModel } = require('../models');

/**
 * 日志服务
 */
class LogService {
  /**
   * 获取推送记录列表
   */
  static async getLogs(userId, options = {}) {
    return await PushLogModel.findByUserId(userId, options);
  }

  /**
   * 获取推送记录详情
   */
  static async getLog(id, userId) {
    const log = await PushLogModel.findById(id);
    if (!log || log.user_id !== userId) {
      throw new Error('记录不存在');
    }
    return log;
  }

  /**
   * 获取推送统计
   */
  static async getStats(userId) {
    return await PushLogModel.getStats(userId);
  }

  /**
   * 清空用户推送记录
   */
  static async clearLogs(userId) {
    return await PushLogModel.deleteByUserId(userId);
  }
}

module.exports = LogService;
