const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * PushDeer 渠道适配器
 *
 * PushDeer 是一个开源的无APP推送服务
 * 官网: https://github.com/easychen/pushdeer
 *
 * 发送消息接口: POST {serverUrl}/message/push (form-urlencoded)
 * 鉴权方式: pushkey 参数
 */
class PushDeerChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} [config.serverUrl] - API 地址，默认官方公共云
   * @param {string} config.pushKey - PushKey
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = (config.serverUrl && config.serverUrl.trim())
      ? config.serverUrl.replace(/\/+$/, '')
      : 'https://api2.pushdeer.com';
    this.pushKey = config.pushKey;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    const params = new URLSearchParams();
    params.append('pushkey', this.pushKey);

    if (type === 'markdown') {
      params.append('type', 'markdown');
      params.append('text', title || '');
      params.append('desp', content);
    } else if (type === 'html') {
      const text = this._stripHtml(content);
      params.append('type', 'text');
      params.append('text', title ? `${title}\n${text}` : text);
    } else {
      params.append('type', 'text');
      params.append('text', title ? `${title}\n${content}` : content);
    }

    logger.info(`PushDeer 发送消息: server=${this.serverUrl}, type=${type}`);

    const response = await axios.post(
      `${this.serverUrl}/message/push`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (data.code !== 0) {
      throw new Error(data.error || `PushDeer 推送失败 (code=${data.code})`);
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
    if (!config.pushKey || config.pushKey.trim() === '') {
      return { valid: false, message: 'PushKey 不能为空' };
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
    return 'pushdeer';
  }

  static getDescription() {
    return '开源无APP推送服务（iOS/Android/Mac）';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: 'API 地址',
        type: 'text',
        required: false,
        placeholder: '默认 https://api2.pushdeer.com（官方公共云）',
        description: 'PushDeer API 地址。留空则使用官方公共云（免费）。自托管请填写自架服务器地址',
      },
      {
        name: 'pushKey',
        label: 'PushKey',
        type: 'text',
        required: true,
        placeholder: '如 PDUxxxxx...',
        description: '在 PushDeer 客户端「Key」标签页创建获取。每个 Key 可绑定不同设备组合',
      },
    ];
  }
}

module.exports = PushDeerChannel;
