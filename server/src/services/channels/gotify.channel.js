const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * Gotify 渠道适配器
 *
 * Gotify 是一个开源的自托管推送通知服务器
 * API 文档: https://gotify.net/api-docs
 *
 * 发送消息接口: POST {serverUrl}/message
 * 鉴权方式: X-Gotify-Key: {appToken}
 */
class GotifyChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.serverUrl - Gotify 服务端地址
   * @param {string} config.appToken - Application Token
   * @param {number} [config.priority] - 消息优先级 0-10，默认 5
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.appToken = config.appToken;
    this.priority = parseInt(config.priority);
    if (isNaN(this.priority) || this.priority < 0 || this.priority > 10) {
      this.priority = 5;
    }
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text', url } = message;
    let text = content;

    if (type === 'html') {
      text = this._stripHtml(text);
    }

    const body = {
      title: title || undefined,
      message: text,
      priority: this.priority,
    };

    const extras = {};
    if (type === 'markdown') {
      extras['client::display'] = { contentType: 'text/markdown' };
    }
    if (url) {
      extras['client::notification::click'] = { url };
    }
    if (Object.keys(extras).length > 0) {
      body.extras = extras;
    }

    logger.info(`Gotify 发送消息: server=${this.serverUrl}, priority=${this.priority}`);
    const response = await axios.post(
      `${this.serverUrl}/message`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Gotify-Key': this.appToken,
        },
        timeout: 15000,
      }
    );

    return response.data;
  }

  _stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  validate(config) {
    if (!config.serverUrl || config.serverUrl.trim() === '') {
      return { valid: false, message: '服务器地址不能为空' };
    }
    try {
      new URL(config.serverUrl);
    } catch {
      return { valid: false, message: '服务器地址格式不正确' };
    }
    if (!config.appToken || config.appToken.trim() === '') {
      return { valid: false, message: 'Application Token 不能为空' };
    }
    if (config.priority !== undefined && config.priority !== '') {
      const p = parseInt(config.priority);
      if (isNaN(p) || p < 0 || p > 10) {
        return { valid: false, message: '优先级必须是 0-10 之间的整数' };
      }
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送的测试消息',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'Gotify';
  }

  static getDescription() {
    return '自托管推送通知服务器';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: '服务器地址',
        type: 'text',
        required: true,
        placeholder: '如 https://gotify.example.com',
        description: 'Gotify 服务端地址',
      },
      {
        name: 'appToken',
        label: 'Application Token',
        type: 'password',
        required: true,
        placeholder: '在 Gotify WebUI 创建应用后获取',
        description: 'Gotify 应用的访问令牌',
      },
      {
        name: 'priority',
        label: '消息优先级',
        type: 'number',
        required: false,
        placeholder: '0-10，默认 5',
        description: '0=静默, 1-3=低, 4-7=正常, 8-10=高优先级持续提醒',
      },
    ];
  }
}

module.exports = GotifyChannel;
