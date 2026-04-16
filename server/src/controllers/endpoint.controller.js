const EndpointService = require('../services/endpoint.service');
const { EndpointModel } = require('../models');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');
const { getAllPresetTemplates, getPresetTemplate } = require('../utils/jsonpath');

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

  /**
   * 更新入站配置
   */
  static async updateInboundConfig(req, res) {
    try {
      const { inboundConfig } = req.body;
      const endpoint = await EndpointService.updateEndpoint(
        parseInt(req.params.id),
        req.user.userId,
        { inbound_config: inboundConfig }
      );
      return ResponseUtil.success(res, endpoint, '入站配置更新成功');
    } catch (error) {
      if (error.message === '接口不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      logger.error('更新入站配置失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 获取入站预设模板列表
   */
  static async getInboundTemplates(req, res) {
    try {
      const templates = getAllPresetTemplates();
      return ResponseUtil.success(res, templates);
    } catch (error) {
      logger.error('获取入站模板失败:', error);
      return ResponseUtil.serverError(res, '获取入站模板失败');
    }
  }

  /**
   * 获取单个入站预设模板
   */
  static async getInboundTemplate(req, res) {
    try {
      const { type } = req.params;
      const template = getPresetTemplate(type);
      if (!template) {
        return ResponseUtil.notFound(res, '模板不存在');
      }
      return ResponseUtil.success(res, {
        id: type,
        ...template,
      });
    } catch (error) {
      logger.error('获取入站模板失败:', error);
      return ResponseUtil.serverError(res, '获取入站模板失败');
    }
  }

  /**
   * 更新关键词过滤配置
   */
  static async updateKeywordFilter(req, res) {
    try {
      const { id } = req.params;
      const { enabled, mode, keywords } = req.body;

      let config = null;

      if (enabled) {
        if (!mode || !['blacklist', 'whitelist'].includes(mode)) {
          return ResponseUtil.badRequest(res, '过滤模式必须是 blacklist 或 whitelist');
        }
        if (!Array.isArray(keywords) || keywords.length === 0 || keywords.length > 50) {
          return ResponseUtil.badRequest(res, '关键词数量为 1~50 个');
        }
        for (const kw of keywords) {
          if (typeof kw !== 'string' || kw.trim().length === 0 || kw.length > 50) {
            return ResponseUtil.badRequest(res, '每个关键词为 1~50 个字符');
          }
        }
        config = {
          enabled: true,
          mode,
          keywords: keywords.map(k => k.trim()).filter(k => k),
        };
      }

      // 校验接口是否存在且属于当前用户
      const existing = await EndpointModel.findById(parseInt(id));
      if (!existing || existing.user_id !== req.user.userId) {
        return ResponseUtil.notFound(res, '接口不存在');
      }

      const endpoint = await EndpointModel.updateKeywordFilter(parseInt(id), config);

      logger.info(`用户 ${req.user.userId} 更新接口 ${id} 关键词过滤配置`);
      return ResponseUtil.success(res, { keyword_filter: config }, '关键词过滤配置已更新');

    } catch (error) {
      logger.error('更新关键词过滤失败:', error);
      return ResponseUtil.serverError(res, error.message || '更新失败');
    }
  }
}

module.exports = EndpointController;
