const { v4: uuidv4 } = require('uuid');
const { EndpointModel } = require('../models');
const logger = require('../utils/logger');

/**
 * 接口服务
 */
class EndpointService {
  /**
   * 获取接口列表
   */
  static async getEndpoints(userId, options = {}) {
    const endpoints = await EndpointModel.findByUserId(userId, options);

    // 为每个接口添加绑定的渠道信息
    const endpointsWithChannels = await Promise.all(
      endpoints.map(async (endpoint) => {
        const channels = await EndpointModel.getChannels(endpoint.id);
        return {
          ...endpoint,
          channels,
        };
      })
    );

    return endpointsWithChannels;
  }

  /**
   * 获取单个接口
   */
  static async getEndpoint(id, userId) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }
    const channels = await EndpointModel.getChannels(id);
    return {
      ...endpoint,
      channels,
    };
  }

  /**
   * 创建接口
   */
  static async createEndpoint(userId, endpointData) {
    const { name, description, token } = endpointData;

    const endpoint = await EndpointModel.create({
      user_id: userId,
      name,
      token: token || this.generateToken(),
      description,
      is_active: true,
    });

    logger.info(`用户 ${userId} 创建了接口: ${name}`);
    return endpoint;
  }

  /**
   * 更新接口
   */
  static async updateEndpoint(id, userId, endpointData) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    const updateData = {};
    if (endpointData.name !== undefined) updateData.name = endpointData.name;
    if (endpointData.description !== undefined) updateData.description = endpointData.description;
    if (endpointData.is_active !== undefined) updateData.is_active = endpointData.is_active;
    if (endpointData.token !== null) {
      // 如果 token 为 null,表示需要自动生成新令牌
      // 如果 token 为 undefined,表示不更新令牌
      // 如果 token 有值,表示使用指定令牌
      const tokenValue = endpointData.token || this.generateToken();
      if (tokenValue) {
        // 检查是否已存在
        const existing = await EndpointModel.findByToken(tokenValue);
        if (existing && existing.id !== id) {
          throw new Error('Token 已被使用');
        }
        updateData.token = tokenValue;
      }
    }

    return await EndpointModel.update(id, updateData);
  }

  /**
   * 删除接口
   */
  static async deleteEndpoint(id, userId) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    await EndpointModel.delete(id);
    logger.info(`用户 ${userId} 删除了接口: ${endpoint.name}`);
    return true;
  }

  /**
   * 重新生成令牌
   */
  static async regenerateToken(id, userId) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    const newToken = this.generateToken();
    await EndpointModel.update(id, { token: newToken });

    logger.info(`用户 ${userId} 重新生成了接口令牌: ${endpoint.name}`);
    return { ...endpoint, token: newToken };
  }

  /**
   * 获取接口关联的渠道
   */
  static async getEndpointChannels(id, userId) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    return await EndpointModel.getChannels(id);
  }

  /**
   * 更新接口渠道绑定
   */
  static async updateEndpointChannels(id, userId, channelIds) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    await EndpointModel.setChannels(id, channelIds);
    return await EndpointModel.getChannels(id);
  }

  /**
   * 获取接口渠道绑定
   */
  static async getEndpointChannels(id, userId) {
    const endpoint = await EndpointModel.findById(id);
    if (!endpoint || endpoint.user_id !== userId) {
      throw new Error('接口不存在');
    }

    return await EndpointModel.getChannels(id);
  }

  /**
   * 生成唯一令牌
   */
  static generateToken() {
    return uuidv4().replace(/-/g, '');
  }

  /**
   * 验证令牌是否可用
   */
  static async validateToken(token) {
    const existing = await EndpointModel.findByToken(token);
    return !existing;
  }
}

module.exports = EndpointService;
