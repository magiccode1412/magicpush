const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * Bark 渠道适配器
 *
 * Bark 是一款 iOS 推送通知应用，支持自部署服务端
 * 官网: https://bark.day.app/
 * GitHub: https://github.com/Finb/Bark
 *
 * 发送消息接口: POST {serverUrl}/push
 * 鉴权方式: device_key 放在 body 中
 */
class BarkChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.serverUrl - Bark 服务端地址
   * @param {string} config.deviceKey - 设备唯一标识
   * @param {string} [config.group] - 通知分组
   * @param {string} [config.sound] - 推送铃声
   * @param {string} [config.level] - 通知级别 (active/timeSensitive/passive/critical)
   * @param {string} [config.icon] - 通知图标 URL
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.deviceKey = config.deviceKey;
    this.group = config.group || '';
    this.sound = config.sound || '';
    this.level = config.level || 'active';
    this.icon = config.icon || '';
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let body = content;

    if (type === 'markdown') {
      body = this._stripMarkdown(body);
    }

    if (type === 'html') {
      body = this._stripHtml(body);
    }

    const payload = {
      device_key: this.deviceKey,
      title: title || undefined,
      body: body,
      level: this.level,
    };

    if (this.group) payload.group = this.group;
    if (this.sound) payload.sound = this.sound;
    if (this.icon) payload.icon = this.icon;

    logger.info(`Bark 发送消息: server=${this.serverUrl}, level=${this.level}`);
    const response = await axios.post(
      `${this.serverUrl}/push`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        timeout: 15000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || '推送失败');
    }

    return response.data;
  }

  _stripMarkdown(markdown) {
    return markdown
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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
    if (!config.deviceKey || config.deviceKey.trim() === '') {
      return { valid: false, message: 'Device Key 不能为空' };
    }
    if (config.level && config.level !== '') {
      const validLevels = ['active', 'timeSensitive', 'passive', 'critical'];
      if (!validLevels.includes(config.level)) {
        return { valid: false, message: '通知级别必须是 active、timeSensitive、passive 或 critical' };
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
    return 'Bark';
  }

  static getDescription() {
    return 'iOS 自定义推送通知';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: '服务器地址',
        type: 'text',
        required: true,
        placeholder: '如 https://api.day.app',
        description: 'Bark 服务端地址，官方为 https://api.day.app，也可自建',
      },
      {
        name: 'deviceKey',
        label: 'Device Key',
        type: 'text',
        required: true,
        placeholder: '打开 Bark App 自动生成',
        description: '设备唯一标识，在 Bark App 首页可复制',
      },
      {
        name: 'group',
        label: '通知分组',
        type: 'text',
        required: false,
        placeholder: '留空则不分组',
        description: '指定推送消息的分组名',
      },
      {
        name: 'sound',
        label: '推送铃声',
        type: 'text',
        required: false,
        placeholder: '如 alarm, minuet，留空使用默认',
        description: '铃声名称，支持 Bark 内置铃声及自定义铃声',
      },
      {
        name: 'level',
        label: '通知级别',
        type: 'select',
        required: false,
        options: [
          { label: '默认（active）', value: 'active' },
          { label: '时效性通知', value: 'timeSensitive' },
          { label: '静默通知', value: 'passive' },
          { label: '临界警报', value: 'critical' },
        ],
        description: 'active=默认, timeSensitive=专注模式可显示, passive=静默, critical=忽略勿扰模式',
      },
      {
        name: 'icon',
        label: '通知图标',
        type: 'text',
        required: false,
        placeholder: '如 https://example.com/icon.png',
        description: '自定义通知图标 URL（仅 iOS 15+ 支持）',
      },
    ];
  }
}

module.exports = BarkChannel;
