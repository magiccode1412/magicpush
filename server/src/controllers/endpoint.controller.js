const EndpointService = require('../services/endpoint.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 接口控制器
 */
class EndpointController {
  /**
   * 获取接口列表
   */
  static async getEndpoints(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
      };
      
      const endpoints = await EndpointService.getEndpoints(req.user.userId, options);
      return ResponseUtil.success(res, endpoints);
    } catch (error) {
      logger.error('获取接口列表失败:', error);
      return ResponseUtil.serverError(res, '获取接口列表失败');
    }
  }

  /**
   * 获取单个接口
   */
  static async getEndpoint(req, res) {
    try {
      const endpoint = await EndpointService.getEndpoint(
        parseInt(req.params.id),
        req.user.userId
      );
      return ResponseUtil.success(res, endpoint);
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('获取接口失败:', error);
      return ResponseUtil.serverError(res, '获取接口失败');
    }
  }

  /**
   * 创建接口
   */
  static async createEndpoint(req, res) {
    try {
      const endpoint = await EndpointService.createEndpoint(req.user.userId, req.body);
      return ResponseUtil.created(res, endpoint, '接口创建成功');
    } catch (error) {
      logger.error('创建接口失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 更新接口
   */
  static async updateEndpoint(req, res) {
    try {
      const endpoint = await EndpointService.updateEndpoint(
        parseInt(req.params.id),
        req.user.userId,
        req.body
      );
      return ResponseUtil.success(res, endpoint, '接口更新成功');
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('更新接口失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 删除接口
   */
  static async deleteEndpoint(req, res) {
    try {
      await EndpointService.deleteEndpoint(parseInt(req.params.id), req.user.userId);
      return ResponseUtil.success(res, null, '接口删除成功');
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('删除接口失败:', error);
      return ResponseUtil.serverError(res, '删除接口失败');
    }
  }

  /**
   * 重新生成令牌
   */
  static async regenerateToken(req, res) {
    try {
      const endpoint = await EndpointService.regenerateToken(
        parseInt(req.params.id),
        req.user.userId
      );
      return ResponseUtil.success(res, endpoint, '令牌重新生成成功');
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('重新生成令牌失败:', error);
      return ResponseUtil.serverError(res, '重新生成令牌失败');
    }
  }

  /**
   * 更新接口渠道绑定
   */
  static async updateEndpointChannels(req, res) {
    try {
      const { channelIds } = req.body;
      const channels = await EndpointService.updateEndpointChannels(
        parseInt(req.params.id),
        req.user.userId,
        channelIds
      );
      return ResponseUtil.success(res, channels, '渠道绑定更新成功');
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('更新渠道绑定失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 获取接口渠道绑定
   */
  static async getEndpointChannels(req, res) {
    try {
      const channels = await EndpointService.getEndpointChannels(
        parseInt(req.params.id),
        req.user.userId
      );
      return ResponseUtil.success(res, channels, '获取渠道绑定成功');
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('获取渠道绑定失败:', error);
      return ResponseUtil.serverError(res, '获取渠道绑定失败');
    }
  }

  /**
   * 验证令牌是否可用
   */
  static async validateToken(req, res) {
    try {
      const { token } = req.body;
      const isValid = await EndpointService.validateToken(token);
      return ResponseUtil.success(res, { valid: isValid }, '令牌验证成功');
    } catch (error) {
      logger.error('验证令牌失败:', error);
      return ResponseUtil.serverError(res, '验证令牌失败');
    }
  }
}

module.exports = EndpointController;
