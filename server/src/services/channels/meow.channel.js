const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * Meow 渠道适配器
 *
 * Meow 是一款专为鸿蒙系统开发的推送通知应用
 * API 文档: https://www.chuckfang.com/MeoW/api_doc.html
 *
 * 发送消息接口: POST https://api.chuckfang.com/{nickname}
 * 鉴权方式: 通过用户昵称标识，无需 Token
 */
class MeowChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.nickname - 用户昵称
   * @param {string} [config.msgType] - 消息类型 text/html，默认 text
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.nickname = config.nickname;
    this.msgType = config.msgType || 'text';
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let msg = content;

    if (type === 'html' || this.msgType === 'html') {
      this.msgType = 'html';
    } else if (type === 'markdown') {
      msg = this._markdownToText(msg);
    }

    const params = {};
    if (this.msgType === 'html') {
      params.msgType = 'html';
      params.htmlHeight = 400;
    }

    const body = {
      title: title || undefined,
      msg,
    };

    logger.info(`Meow 发送消息: nickname=${this.nickname}, msgType=${this.msgType}`);
    const response = await axios.post(
      `https://api.chuckfang.com/${encodeURIComponent(this.nickname)}`,
      body,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return response.data;
  }

  _markdownToText(md) {
    return md
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }

  validate(config) {
    if (!config.nickname || config.nickname.trim() === '') {
      return { valid: false, message: '用户昵称不能为空' };
    }
    if (config.nickname.includes('/')) {
      return { valid: false, message: '用户昵称不能包含斜杠' };
    }
    if (config.msgType && config.msgType !== 'text' && config.msgType !== 'html') {
      return { valid: false, message: '消息类型只支持 text 或 html' };
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
    return 'Meow';
  }

  static getDescription() {
    return '鸿蒙系统推送通知应用';
  }

  static getConfigFields() {
    return [
      {
        name: 'nickname',
        label: '用户昵称',
        type: 'text',
        required: true,
        placeholder: '在 Meow App 中设置的昵称',
        description: '用于标识推送目标的用户昵称',
      },
      {
        name: 'msgType',
        label: '消息类型',
        type: 'select',
        required: false,
        defaultValue: 'text',
        options: [
          { label: '纯文本', value: 'text' },
          { label: 'HTML', value: 'html' },
        ],
        description: 'text=纯文本显示，html=在App中渲染HTML格式',
      },
    ];
  }
}

module.exports = MeowChannel;
