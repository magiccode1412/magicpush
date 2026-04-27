const bcrypt = require('bcryptjs');
const { UserModel, ChannelModel, EndpointModel, SettingsModel } = require('../models');
const { getShortVersion } = require('../config/version');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 用户控制器
 */
class UserController {
  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      return ResponseUtil.success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.created_at,
      });
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      return ResponseUtil.serverError(res, '获取用户信息失败');
    }
  }

  /**
   * 更新当前用户信息
   */
  static async updateCurrentUser(req, res) {
    try {
      const { username, avatar } = req.body;
      const updateData = {};

      if (username !== undefined) updateData.username = username;
      if (avatar !== undefined) updateData.avatar = avatar;

      const user = await UserModel.update(req.user.userId, updateData);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      return ResponseUtil.success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      }, '用户信息更新成功');
    } catch (error) {
      logger.error('更新用户信息失败:', error);
      return ResponseUtil.serverError(res, '更新用户信息失败');
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        return ResponseUtil.badRequest(res, '旧密码错误');
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.update(req.user.userId, { password: hashedPassword });

      return ResponseUtil.success(res, null, '密码修改成功');
    } catch (error) {
      logger.error('修改密码失败:', error);
      return ResponseUtil.serverError(res, '修改密码失败');
    }
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(req, res) {
    try {
      const stats = await UserModel.getStats(req.user.userId);
      return ResponseUtil.success(res, stats);
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      return ResponseUtil.serverError(res, '获取用户统计失败');
    }
  }

  /**
   * 导出用户配置
   */
  static async exportConfig(req, res) {
    try {
      const userId = req.user.userId;

      // 获取用户信息
      const user = await UserModel.findById(userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 获取渠道配置
      const channels = await ChannelModel.findByUserId(userId);

      // 获取接口配置
      const endpoints = await EndpointModel.findByUserId(userId, { page: 1, pageSize: 1000 });

      // 获取接口-渠道关联
      const endpointChannels = await EndpointModel.getAllEndpointChannels(userId);

      const config = {
        version: getShortVersion(),
        exportTime: new Date().toISOString(),
        user: {
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        },
        channels: channels.map(ch => ({
          name: ch.name,
          channelType: ch.channel_type,
          config: ch.config || {},
          isActive: ch.is_active === 1,
        })),
        endpoints: endpoints.map(ep => ({
          name: ep.name,
          description: ep.description,
          token: ep.token,
          isActive: ep.is_active === 1,
          inboundConfig: ep.inbound_config || null,
          keywordFilter: ep.keyword_filter || null,
          channelIds: endpointChannels
            .filter(ec => ec.endpoint_id === ep.id)
            .map(ec => ec.channel_name),
        })),
      };

      return ResponseUtil.success(res, config);
    } catch (error) {
      logger.error('导出配置失败:', error);
      return ResponseUtil.serverError(res, '导出配置失败');
    }
  }

  /**
   * 导入用户配置
   */
  static async importConfig(req, res) {
    try {
      const userId = req.user.userId;
      const importData = req.body;

      if (!importData || !importData.channels || !importData.endpoints) {
        return ResponseUtil.badRequest(res, '无效的配置文件格式');
      }

      const result = {
        channels: { created: 0, skipped: 0 },
        endpoints: { created: 0, skipped: 0 },
      };

      // 导入渠道
      const channelNameMap = {}; // 用于映射渠道名称到新ID
      for (const ch of importData.channels) {
        try {
          // 检查是否已存在同名渠道
          const existing = await ChannelModel.findByUserIdAndName(userId, ch.name);
          if (existing) {
            channelNameMap[ch.name] = existing.id;
            result.channels.skipped++;
            continue;
          }

          const newChannel = await ChannelModel.create({
            user_id: userId,
            channel_type: ch.channelType,
            name: ch.name,
            config: ch.config,
            is_active: ch.isActive !== false,
          });
          channelNameMap[ch.name] = newChannel.id;
          result.channels.created++;
        } catch (err) {
          logger.warn(`导入渠道失败: ${ch.name}`, err.message);
          result.channels.skipped++;
        }
      }

      // 导入接口
      for (const ep of importData.endpoints) {
        try {
          // 检查是否已存在同名接口
          const existing = await EndpointModel.findByUserIdAndName(userId, ep.name);
          if (existing) {
            result.endpoints.skipped++;
            continue;
          }

          const newEndpoint = await EndpointModel.create({
            user_id: userId,
            name: ep.name,
            description: ep.description,
            token: ep.token || require('uuid').v4().replace(/-/g, ''),
            is_active: ep.isActive !== false,
            inbound_config: ep.inboundConfig ? JSON.stringify(ep.inboundConfig) : null,
            keyword_filter: ep.keywordFilter ? JSON.stringify(ep.keywordFilter) : null,
          });

          // 绑定渠道
          if (ep.channelIds && ep.channelIds.length > 0) {
            const channelIds = ep.channelIds
              .map(name => channelNameMap[name])
              .filter(id => id !== undefined);
            if (channelIds.length > 0) {
              await EndpointModel.setChannels(newEndpoint.id, channelIds);
            }
          }

          result.endpoints.created++;
        } catch (err) {
          logger.warn(`导入接口失败: ${ep.name}`, err.message);
          result.endpoints.skipped++;
        }
      }

      logger.info(`用户 ${userId} 导入配置: 渠道+${result.channels.created}, 接口+${result.endpoints.created}`);
      return ResponseUtil.success(res, result, '配置导入成功');
    } catch (error) {
      logger.error('导入配置失败:', error);
      return ResponseUtil.serverError(res, '导入配置失败');
    }
  }

  /**
   * 检查是否为管理员
   */
  static checkAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
      return ResponseUtil.forbidden(res, '需要管理员权限');
    }
    next();
  }

  /**
   * 获取注册设置
   */
  static getRegistrationSetting(req, res) {
    try {
      const enabled = SettingsModel.getBoolean('registration_enabled', true);
      return ResponseUtil.success(res, { enabled }, '获取注册设置成功');
    } catch (error) {
      logger.error('获取注册设置失败:', error);
      return ResponseUtil.serverError(res, '获取注册设置失败');
    }
  }

  /**
   * 更新注册设置
   */
  static updateRegistrationSetting(req, res) {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return ResponseUtil.badRequest(res, '参数错误：enabled 必须为布尔值');
      }

      SettingsModel.setBoolean('registration_enabled', enabled);
      logger.info(`管理员 ${req.user.userId} ${enabled ? '开启' : '关闭'}了注册功能`);

      return ResponseUtil.success(res, { enabled }, `注册功能已${enabled ? '开启' : '关闭'}`);
    } catch (error) {
      logger.error('更新注册设置失败:', error);
      return ResponseUtil.serverError(res, '更新注册设置失败');
    }
  }

  /**
   * 获取全局免打扰开关状态
   */
  static getDndGlobalSetting(req, res) {
    try {
      const enabled = SettingsModel.getBoolean('dnd_global_enabled', false);
      return ResponseUtil.success(res, { enabled });
    } catch (error) {
      logger.error('获取免打扰全局设置失败:', error);
      return ResponseUtil.serverError(res, '获取设置失败');
    }
  }

  /**
   * 更新全局免打扰开关
   */
  static updateDndGlobalSetting(req, res) {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return ResponseUtil.badRequest(res, '参数错误：enabled 必须为布尔值');
      }

      SettingsModel.setBoolean('dnd_global_enabled', enabled);
      logger.info(`管理员 ${req.user.userId} ${enabled ? '开启' : '关闭'}了全局免打扰功能`);

      return ResponseUtil.success(res, { enabled }, `全局免打扰已${enabled ? '开启' : '关闭'}`);
    } catch (error) {
      logger.error('更新免打扰全局设置失败:', error);
      return ResponseUtil.serverError(res, '更新失败');
    }
  }
}

module.exports = UserController;
