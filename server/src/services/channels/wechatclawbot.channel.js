const BaseChannel = require('./base.channel');
const IlinkClient = require('../clawbot/ilink-client');
const logger = require('../../utils/logger');

/**
 * 微信龙虾机器人渠道适配器
 * 通过微信 ClawBot (ilink API) 推送消息到个人微信
 */
class WechatclawbotChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.token = config.token;
    this.toUserId = config.toUserId;
    this.baseUrl = config.baseUrl || 'https://ilinkai.weixin.qq.com';
    this.contextToken = config.contextToken;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let text = title ? `${title}\n\n${content}` : content;

    if (type === 'markdown') {
      text = this._stripMarkdown(text);
    } else if (type === 'html') {
      text = this._stripHtml(text);
    }

    const client = new IlinkClient({ baseUrl: this.baseUrl, token: this.token });
    return client.sendTextMessage({
      toUserId: this.toUserId,
      text,
      contextToken: this.contextToken,
    });
  }

  validate(config) {
    if (!config.token) return { valid: false, message: 'Bot Token 不能为空' };
    if (!config.toUserId) return { valid: false, message: '推送用户 ID 不能为空' };
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
      logger.error('微信龙虾机器人测试失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return '微信龙虾机器人';
  }

  static getDescription() {
    return '通过微信 ClawBot 推送消息到个人微信';
  }

  static getConfigFields() {
    return [];
  }

  _stripMarkdown(text) {
    return text
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  _stripHtml(text) {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

module.exports = WechatclawbotChannel;
