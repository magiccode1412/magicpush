const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * 微信公众号模板消息适配器
 * 支持测试号和正式服务号
 */
class WechatOfficialChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.templateId = config.templateId;
    this.openIds = config.openIds || '';
    // access_token 缓存
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 获取 access_token
   * 带缓存机制，token 有效期 2 小时
   */
  async getAccessToken() {
    // 检查缓存是否有效（提前 5 分钟刷新）
    if (this.accessToken && Date.now() < this.tokenExpireTime - 5 * 60 * 1000) {
      return this.accessToken;
    }

    try {
      const url = 'https://api.weixin.qq.com/cgi-bin/token';
      const response = await axios.get(url, {
        params: {
          grant_type: 'client_credential',
          appid: this.appId,
          secret: this.appSecret,
        },
        timeout: 10000,
      });

      if (response.data.errcode) {
        throw new Error(`获取access_token失败: ${response.data.errmsg} (${response.data.errcode})`);
      }

      this.accessToken = response.data.access_token;
      this.tokenExpireTime = Date.now() + response.data.expires_in * 1000;

      logger.info(`微信公众号 access_token 已更新，有效期 ${response.data.expires_in} 秒`);
      return this.accessToken;
    } catch (error) {
      logger.error('获取微信公众号 access_token 失败:', error);
      throw error;
    }
  }

  /**
   * 发送模板消息给单个用户
   */
  async sendTemplateMessage(accessToken, openId, title, content) {
    const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

    // 模板数据结构
    const payload = {
      touser: openId,
      template_id: this.templateId,
      data: {
        title: {
          value: title,
          color: '#173177',
        },
        content: {
          value: content,
          color: '#666666',
        },
      },
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    if (response.data.errcode !== 0) {
      throw new Error(`发送失败: ${response.data.errmsg} (${response.data.errcode})`);
    }

    return response.data.msgid;
  }

  async send(message) {
    const { title, content } = message;
    // 获取 access_token
    const accessToken = await this.getAccessToken();

    // 解析 OpenID 列表
    const openIdList = this.openIds
      .split(/[,\n]/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (openIdList.length === 0) {
      throw new Error('未配置接收用户的 OpenID');
    }

    // 发送给所有用户
    const results = [];
    const errors = [];

    for (const openId of openIdList) {
      try {
        const msgId = await this.sendTemplateMessage(accessToken, openId, title || '通知', content);
        results.push({ openId, msgId, success: true });
      } catch (error) {
        logger.error(`微信公众号发送失败 (OpenID: ${openId}):`, error.message);
        errors.push({ openId, error: error.message });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`所有用户发送失败: ${errors.map(e => e.error).join('; ')}`);
    }

    return {
      success: true,
      messageId: results.map(r => r.msgId).join(','),
      sent: results.length,
      failed: errors.length,
    };
  }

  validate(config) {
    if (!config.appId || config.appId.trim() === '') {
      return { valid: false, message: 'AppID 不能为空' };
    }
    if (!config.appSecret || config.appSecret.trim() === '') {
      return { valid: false, message: 'AppSecret 不能为空' };
    }
    if (!config.templateId || config.templateId.trim() === '') {
      return { valid: false, message: '模板 ID 不能为空' };
    }
    if (!config.openIds || config.openIds.trim() === '') {
      return { valid: false, message: '用户 OpenID 不能为空' };
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      // 测试获取 access_token
      await this.getAccessToken();
      return { success: true, message: '连接测试成功，access_token 获取正常' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return '微信公众号';
  }

  static getDescription() {
    return '微信公众号模板消息，支持测试号和正式服务号';
  }

  static getConfigFields() {
    return [
      {
        name: 'appId',
        label: 'AppID',
        type: 'text',
        required: true,
        placeholder: '请输入公众号 AppID',
        description: '在公众号后台 - 开发 - 基本配置中获取',
      },
      {
        name: 'appSecret',
        label: 'AppSecret',
        type: 'password',
        required: true,
        placeholder: '请输入公众号 AppSecret',
        description: '在公众号后台 - 开发 - 基本配置中获取',
      },
      {
        name: 'templateId',
        label: '模板 ID',
        type: 'text',
        required: true,
        placeholder: '请输入消息模板 ID',
        description: '在公众号后台 - 功能 - 模板消息中获取',
      },
      {
        name: 'openIds',
        label: '用户 OpenID',
        type: 'textarea',
        required: true,
        placeholder: '用户OpenID，多个用逗号或换行分隔',
        description: '接收消息的用户 OpenID，可在公众号后台 - 用户管理中查看',
      },
    ];
  }
}

module.exports = WechatOfficialChannel;
