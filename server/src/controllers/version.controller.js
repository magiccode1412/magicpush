const { getVersionInfo } = require('../config/version');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 版本控制器
 */
class VersionController {
  /**
   * 获取版本信息
   */
  static getVersionInfo(req, res) {
    try {
      const versionInfo = getVersionInfo();
      return ResponseUtil.success(res, {
        ...versionInfo,
        serverTime: new Date().toISOString(),
      }, '获取版本信息成功');
    } catch (error) {
      logger.error('获取版本信息失败:', error);
      return ResponseUtil.serverError(res, '获取版本信息失败');
    }
  }
}

module.exports = VersionController;
