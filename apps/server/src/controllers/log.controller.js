const LogService = require('../services/log.service');
const { SettingsModel } = require('../models');
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
        keyword: req.query.keyword || undefined,
        keywordScope: req.query.keywordScope || undefined,
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

  /**
   * 获取自动清理设置
   */
  static getAutoCleanupSetting(req, res) {
    try {
      const enabled = SettingsModel.getBoolean('log_auto_cleanup_enabled', false);
      const retentionDays = parseInt(SettingsModel.get('log_retention_days', '30')) || 30;
      return ResponseUtil.success(res, { enabled, retentionDays }, '获取自动清理设置成功');
    } catch (error) {
      logger.error('获取自动清理设置失败:', error);
      return ResponseUtil.serverError(res, '获取自动清理设置失败');
    }
  }

  /**
   * 更新自动清理设置
   */
  static async updateAutoCleanupSetting(req, res) {
    try {
      const { enabled, retentionDays } = req.body;

      if (typeof enabled !== 'boolean') {
        return ResponseUtil.badRequest(res, '参数错误：enabled 必须为布尔值');
      }

      const days = parseInt(retentionDays);
      if (!days || days < 1 || days > 365) {
        return ResponseUtil.badRequest(res, '参数错误：retentionDays 必须为 1-365 之间的数字');
      }

      SettingsModel.setBoolean('log_auto_cleanup_enabled', enabled);
      SettingsModel.set('log_retention_days', String(days));

      logger.info(`用户 ${req.user.userId} ${enabled ? '开启' : '关闭'}了自动清理，保留天数: ${days}`);

      return ResponseUtil.success(
        res,
        { enabled, retentionDays: days },
        `自动清理已${enabled ? '开启' : '关闭'}`
      );
    } catch (error) {
      logger.error('更新自动清理设置失败:', error);
      return ResponseUtil.serverError(res, '更新自动清理设置失败');
    }
  }
}

module.exports = LogController;
