const bcrypt = require('bcryptjs');
const { UserModel } = require('../models');
const ResponseUtil = require('../utils/response');
const RateLimitConfigService = require('../services/rateLimitConfig.service');
const logger = require('../utils/logger');

/**
 * 管理员控制器 - 用户管理
 */
class AdminController {
  /**
   * 获取用户列表
   */
  static async getUsers(req, res) {
    try {
      const { page = 1, pageSize = 10, keyword = '' } = req.query;
      
      const result = await UserModel.findAll({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
      });

      return ResponseUtil.success(res, result);
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      return ResponseUtil.serverError(res, '获取用户列表失败');
    }
  }

  /**
   * 创建用户
   */
  static async createUser(req, res) {
    try {
      const { username, email, password, avatar, role = 'user' } = req.body;

      // 验证必填字段
      if (!username || !email || !password) {
        return ResponseUtil.badRequest(res, '用户名、邮箱和密码不能为空');
      }

      // 检查用户名是否已存在
      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        return ResponseUtil.badRequest(res, '用户名已存在');
      }

      // 检查邮箱是否已存在
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return ResponseUtil.badRequest(res, '邮箱已存在');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户
      const user = await UserModel.create({
        username,
        email,
        password: hashedPassword,
        avatar,
        role,
      });

      logger.info(`管理员 ${req.user.userId} 创建用户: ${username}`);

      return ResponseUtil.success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.created_at,
      }, '用户创建成功');
    } catch (error) {
      logger.error('创建用户失败:', error);
      return ResponseUtil.serverError(res, '创建用户失败');
    }
  }

  /**
   * 更新用户
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, avatar, role } = req.body;

      // 检查用户是否存在
      const existingUser = await UserModel.findByIdForAdmin(id);
      if (!existingUser) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 如果修改用户名，检查是否重复
      if (username && username !== existingUser.username) {
        const usernameExists = await UserModel.findByUsername(username);
        if (usernameExists && usernameExists.id != id) {
          return ResponseUtil.badRequest(res, '用户名已存在');
        }
      }

      // 如果修改邮箱，检查是否重复
      if (email && email !== existingUser.email) {
        const emailExists = await UserModel.findByEmail(email);
        if (emailExists && emailExists.id != id) {
          return ResponseUtil.badRequest(res, '邮箱已存在');
        }
      }

      // 更新用户信息
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (role !== undefined) updateData.role = role;

      const user = await UserModel.updateByAdmin(id, updateData);

      logger.info(`管理员 ${req.user.userId} 更新用户 ${id}`);

      return ResponseUtil.success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }, '用户更新成功');
    } catch (error) {
      logger.error('更新用户失败:', error);
      return ResponseUtil.serverError(res, '更新用户失败');
    }
  }

  /**
   * 删除用户
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // 不能删除自己
      if (parseInt(id) === req.user.userId) {
        return ResponseUtil.badRequest(res, '不能删除当前登录的管理员账号');
      }

      // 检查用户是否存在
      const existingUser = await UserModel.findByIdForAdmin(id);
      if (!existingUser) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 删除用户
      await UserModel.deleteById(id);

      logger.info(`管理员 ${req.user.userId} 删除用户 ${id}`);

      return ResponseUtil.success(res, null, '用户删除成功');
    } catch (error) {
      logger.error('删除用户失败:', error);
      return ResponseUtil.serverError(res, '删除用户失败');
    }
  }

  /**
   * 重置用户密码
   */
  static async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return ResponseUtil.badRequest(res, '新密码不能少于6位');
      }

      // 检查用户是否存在
      const existingUser = await UserModel.findById(id);
      if (!existingUser) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await UserModel.updateByAdmin(id, { password: hashedPassword });

      logger.info(`管理员 ${req.user.userId} 重置用户 ${id} 密码`);

      return ResponseUtil.success(res, null, '密码重置成功');
    } catch (error) {
      logger.error('重置密码失败:', error);
      return ResponseUtil.serverError(res, '重置密码失败');
    }
  }
  /**
   * 获取限流配置
   */
  static getRateLimitConfig(req, res) {
    try {
      const config = RateLimitConfigService.getAll();
      const defaults = RateLimitConfigService.getDefaults();
      const bounds = RateLimitConfigService.getBounds();
      return ResponseUtil.success(res, { config, defaults, bounds });
    } catch (error) {
      logger.error('获取限流配置失败:', error);
      return ResponseUtil.serverError(res, '获取限流配置失败');
    }
  }

  /**
   * 更新限流配置
   */
  static updateRateLimitConfig(req, res) {
    try {
      const results = RateLimitConfigService.setMany(req.body);
      return ResponseUtil.success(res, results, '限流配置更新成功');
    } catch (error) {
      logger.error('更新限流配置失败:', error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 重置限流配置
   */
  static resetRateLimitConfig(req, res) {
    try {
      const config = RateLimitConfigService.reset();
      logger.info(`管理员 ${req.user.userId} 重置限流配置`);
      return ResponseUtil.success(res, config, '限流配置已重置为默认值');
    } catch (error) {
      logger.error('重置限流配置失败:', error);
      return ResponseUtil.serverError(res, '重置限流配置失败');
    }
  }
}

module.exports = AdminController;
