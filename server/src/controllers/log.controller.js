const LogService = require('../services/log.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 日志控制器
 */
class LogController {
  /**
   * 获取推送记录列表
   */
  static async getLogs(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
        endpointId: req.query.endpointId ? parseInt(req.query.endpointId) : undefined,
        channelId: req.query.channelId ? parseInt(req.query.channelId) : undefined,
        channelType: req.query.channelType,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const logs = await LogService.getLogs(req.user.userId, options);
      return ResponseUtil.success(res, logs);
    } catch (error) {
      logger.error('获取推送记录失败:', error);
      return ResponseUtil.serverError(res, '获取推送记录失败');
    }
  }

  /**
   * 获取推送记录详情
   */
  static async getLog(req, res) {
    try {
      const log = await LogService.getLog(parseInt(req.params.id), req.user.userId);
      return ResponseUtil.success(res, log);
    } catch (error) {
      if (error.message === '记录不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('获取推送记录详情失败:', error);
      return ResponseUtil.serverError(res, '获取推送记录详情失败');
    }
  }

  /**
   * 获取推送统计
   */
  static async getStats(req, res) {
    try {
      const stats = await LogService.getStats(req.user.userId);
      return ResponseUtil.success(res, stats);
    } catch (error) {
      logger.error('获取推送统计失败:', error);
      return ResponseUtil.serverError(res, '获取推送统计失败');
    }
  }

  /**
   * 清空推送记录
   */
  static async clearLogs(req, res) {
    try {
      const result = await LogService.clearLogs(req.user.userId);
      logger.info(`用户 ${req.user.userId} 清空了推送记录，删除 ${result.changes} 条`);
      return ResponseUtil.success(res, { deleted: result.changes }, '推送记录已清空');
    } catch (error) {
      logger.error('清空推送记录失败:', error);
      return ResponseUtil.serverError(res, '清空推送记录失败');
    }
  }
}

module.exports = LogController;
