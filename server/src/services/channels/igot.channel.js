const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * iGot 渠道适配器
 *
 * iGot 是一个开放式通知推送服务平台
 * 官网: https://push.hellyw.com
 * 文档: https://push.hellyw.com/doc/#/
 *
 * 发送消息接口: POST {serverUrl}/{key} (JSON)
 * 鉴权方式: URL Path 中的 key
 */
class IGotChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} [config.serverUrl] - API 地址，默认官方公共云
   * @param {string} config.key - iGot 分配的 Key
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = (config.serverUrl && config.serverUrl.trim())
      ? config.serverUrl.replace(/\/+$/, '')
      : 'https://push.hellyw.com';
    this.key = config.key;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let body;

    if (type === 'markdown') {
      body = {
        title: title || '',
        content: content,
      };
    } else if (type === 'html') {
      const text = this._stripHtml(content);
      body = {
        title: title ? title.slice(0, 20) : '',
        content: title ? `${title}\n${text}` : text,
      };
    } else {
      body = {
        title: title ? title.slice(0, 20) : '',
        content: title ? `${title}\n${content}` : content,
      };
    }

    logger.info(`iGot 发送消息: server=${this.serverUrl}, type=${type}`);

    const response = await axios.post(
      `${this.serverUrl}/${encodeURIComponent(this.key)}`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    // iGot 返回 ret=0 为成功
    const data = response.data;
    if (data.ret !== 0) {
      throw new Error(data.errMsg || `iGot 推送失败 (ret=${data.ret})`);
    }

    return data;
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
    if (config.serverUrl && config.serverUrl.trim() !== '') {
      try {
        new URL(config.serverUrl);
      } catch {
        return { valid: false, message: '服务器地址格式不正确' };
      }
    }
    if (!config.key || config.key.trim() === '') {
      return { valid: false, message: 'Key 不能为空' };
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送(MagicPush)的测试消息 🎉',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'igot';
  }

  static getDescription() {
    return '开放式通知推送服务（iOS/Android）';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: 'API 地址',
        type: 'text',
        required: false,
        placeholder: '默认 https://push.hellyw.com（官方公共云）',
        description: 'iGot API 地址。留空则使用官方公共服务',
      },
      {
        name: 'key',
        label: 'Key',
        type: 'text',
        required: true,
        placeholder: '请填写 iGot 分配的 Key',
        description: '在 iGot 控制台获取的 Key，用于身份验证',
      },
    ];
  }
}

module.exports = IGotChannel;
