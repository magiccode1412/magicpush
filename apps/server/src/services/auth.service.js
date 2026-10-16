const bcrypt = require('bcryptjs');
const { UserModel, RefreshTokenModel, SettingsModel } = require('../models');
const TokenUtil = require('../utils/token');
const logger = require('../utils/logger');

/**
 * 认证服务
 */
class AuthService {
  /**
   * 检查注册是否开放
   */
  static isRegistrationEnabled() {
    return SettingsModel.getBoolean('registration_enabled', true);
  }

  /**
   * 用户注册
   */
  static async register(userData) {
    const { username, email, password } = userData;

    // 检查注册是否开放
    const isEnabled = this.isRegistrationEnabled();
    if (!isEnabled) {
      throw new Error('注册功能已关闭，请联系管理员');
    }

    // 检查邮箱是否已存在
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 判断是否为首个用户
    const userCount = await UserModel.getUserCount();
    const isFirstUser = userCount === 0;
    const role = isFirstUser ? 'admin' : 'user';

    // 创建用户
    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    // 首个用户注册后，自动关闭注册
    if (isFirstUser) {
      SettingsModel.setBoolean('registration_enabled', false);
      logger.info('首个用户注册完成，自动关闭注册功能');
    }

    // 生成令牌
    const tokens = TokenUtil.generateTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // 保存刷新令牌
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7);
    await RefreshTokenModel.create(user.id, tokens.refreshToken, refreshTokenExpires.toISOString());

    logger.info(`用户注册成功: ${username} (${email}), 角色: ${role}`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * 用户登录
   */
  static async login(email, password) {
    // 查找用户
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误');
    }

    // 生成令牌
    const tokens = TokenUtil.generateTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // 保存刷新令牌
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7);
    await RefreshTokenModel.create(user.id, tokens.refreshToken, refreshTokenExpires.toISOString());

    logger.info(`用户登录成功: ${user.username} (${email})`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(refreshToken) {
    // 验证刷新令牌
    const decoded = TokenUtil.verifyToken(refreshToken);
    if (!decoded) {
      throw new Error('刷新令牌无效');
    }

    // 检查令牌是否在数据库中
    const storedToken = await RefreshTokenModel.findByToken(refreshToken);
    if (!storedToken) {
      throw new Error('刷新令牌已失效');
    }

    // 检查是否过期
    if (new Date(storedToken.expires_at) < new Date()) {
      await RefreshTokenModel.deleteByToken(refreshToken);
      throw new Error('刷新令牌已过期');
    }

    // 查找用户
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 删除旧的刷新令牌
    await RefreshTokenModel.deleteByToken(refreshToken);

    // 生成新令牌
    const tokens = TokenUtil.generateTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // 保存新的刷新令牌
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7);
    await RefreshTokenModel.create(user.id, tokens.refreshToken, refreshTokenExpires.toISOString());

    logger.info(`令牌刷新成功: ${user.username}`);

    return tokens;
  }

  /**
   * 用户登出
   */
  static async logout(refreshToken) {
    if (refreshToken) {
      await RefreshTokenModel.deleteByToken(refreshToken);
      logger.info('用户登出成功');
    }
    return true;
  }
}

module.exports = AuthService;
