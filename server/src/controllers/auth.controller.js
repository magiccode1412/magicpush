const AuthService = require('../services/auth.service');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 检查注册状态
   */
  static checkRegistrationStatus(req, res) {
    try {
      const enabled = AuthService.isRegistrationEnabled();
      return ResponseUtil.success(res, { enabled }, '获取注册状态成功');
    } catch (error) {
      logger.error('获取注册状态失败:', error.message);
      return ResponseUtil.serverError(res, '获取注册状态失败');
    }
  }

  /**
   * 用户注册
   */
  static async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      return ResponseUtil.created(res, result, '注册成功');
    } catch (error) {
      logger.error('注册失败:', error.message);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 用户登录
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return ResponseUtil.success(res, result, '登录成功');
    } catch (error) {
      logger.error('登录失败:', error.message);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshToken(refreshToken);
      return ResponseUtil.success(res, tokens, '令牌刷新成功');
    } catch (error) {
      logger.error('刷新令牌失败:', error.message);
      return ResponseUtil.unauthorized(res, error.message);
    }
  }

  /**
   * 用户登出
   */
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      return ResponseUtil.success(res, null, '登出成功');
    } catch (error) {
      logger.error('登出失败:', error.message);
      return ResponseUtil.serverError(res, '登出失败');
    }
  }
}

module.exports = AuthController;
