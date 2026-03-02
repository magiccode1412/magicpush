const ChannelService = require('../services/channel.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 渠道控制器
 */
class ChannelController {
  /**
   * 获取渠道列表
   */
  static async getChannels(req, res) {
    try {
      const channels = await ChannelService.getChannels(req.user.userId);
      return ResponseUtil.success(res, channels);
    } catch (error) {
      logger.error('获取渠道列表失败:', error);
      return ResponseUtil.serverError(res, '获取渠道列表失败');
    }
  }

  /**
   * 获取渠道类型列表
   */
  static async getChannelTypes(req, res) {
    try {
      const types = ChannelService.getChannelTypes();
      return ResponseUtil.success(res, types);
    } catch (error) {
      logger.error('获取渠道类型失败:', error);
      return ResponseUtil.serverError(res, '获取渠道类型失败');
    }
  }

  /**
   * 获取单个渠道
   */
  static async getChannel(req, res) {
    try {
      const channel = await ChannelService.getChannel(
        parseInt(req.params.id),
        req.user.userId
      );
      return ResponseUtil.success(res, channel);
    } catch (error) {
      if (error.message === '渠道不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('获取渠道失败:', error);
      return ResponseUtil.serverError(res, '获取渠道失败');
    }
  }

  /**
   * 创建渠道
   */
  static async createChannel(req, res) {
    try {
      const channel = await ChannelService.createChannel(req.user.userId, req.body);
      return ResponseUtil.created(res, channel, '渠道创建成功');
    } catch (error) {
      logger.error('创建渠道失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 更新渠道
   */
  static async updateChannel(req, res) {
    try {
      const channel = await ChannelService.updateChannel(
        parseInt(req.params.id),
        req.user.userId,
        req.body
      );
      return ResponseUtil.success(res, channel, '渠道更新成功');
    } catch (error) {
      if (error.message === '渠道不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('更新渠道失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 删除渠道
   */
  static async deleteChannel(req, res) {
    try {
      await ChannelService.deleteChannel(parseInt(req.params.id), req.user.userId);
      return ResponseUtil.success(res, null, '渠道删除成功');
    } catch (error) {
      if (error.message === '渠道不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('删除渠道失败:', error);
      return ResponseUtil.serverError(res, '删除渠道失败');
    }
  }

  /**
   * 测试渠道
   */
  static async testChannel(req, res) {
    try {
      const result = await ChannelService.testChannel(
        parseInt(req.params.id),
        req.user.userId
      );
      
      if (result.success) {
        return ResponseUtil.success(res, result, '渠道测试成功');
      } else {
        return ResponseUtil.error(res, result.message, 400, 400);
      }
    } catch (error) {
      if (error.message === '渠道不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('测试渠道失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}

module.exports = ChannelController;
