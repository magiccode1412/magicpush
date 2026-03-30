const BaseChannel = require('./base.channel');
const IlinkClient = require('../clawbot/ilink-client');
const { ChannelModel } = require('../../models');
const logger = require('../../utils/logger');

// 微信龙虾机器人推送限制常量
const MAX_SEND_COUNT = 10;           // 最大主动推送消息数
const REMIND_COUNT_THRESHOLD = 9;    // 第几条时追加提醒
const WINDOW_HOURS = 24;             // 24小时窗口
const REMIND_BEFORE_EXPIRE_MIN = 10;  // 过期前多少分钟追加提醒

/**
 * 微信龙虾机器人渠道适配器
 * 通过微信 ClawBot (ilink API) 推送消息到个人微信
 *
 * 微信龙虾机器人限制：
 * - Bot 连续主动发送 MAX_SEND_COUNT 条消息后，需用户主动发消息才能继续推送
 * - 自用户上次主动发消息起 WINDOW_HOURS 小时后，也需用户主动发消息才能继续推送
 *
 * 本适配器通过在渠道 config 中记录 sendCount 和 lastUserMsgTime 来追踪额度，
 * 并在接近限额时自动在消息末尾追加提醒。
 */
class WechatclawbotChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.token = config.token;
    this.toUserId = config.toUserId;
    this.baseUrl = config.baseUrl || 'https://ilinkai.weixin.qq.com';
    this.contextToken = config.contextToken;
    this.channelId = channelId || null;
    this.sendCount = config.sendCount || 0;
    this.lastUserMsgTime = config.lastUserMsgTime || null;
  }

  /**
   * 检查是否需要在本次消息中追加额度提醒
   */
  _shouldRemind() {
    // 条件1: 发送数达到提醒阈值（第9条）
    if (this.sendCount >= REMIND_COUNT_THRESHOLD) {
      return true;
    }
    // 条件2: 距离24小时窗口过期不足 REMIND_BEFORE_EXPIRE_MIN 分钟
    if (this.lastUserMsgTime) {
      const elapsed = Date.now() - this.lastUserMsgTime;
      const remainMs = WINDOW_HOURS * 3600 * 1000 - elapsed;
      if (remainMs > 0 && remainMs <= REMIND_BEFORE_EXPIRE_MIN * 60 * 1000) {
        return true;
      }
    }
    return false;
  }

  /**
   * 构建提醒文本
   */
  _buildRemindText() {
    const parts = ['\n\n---\n[提示] 回复任意消息以保持机器人推送畅通'];
    if (this.sendCount >= REMIND_COUNT_THRESHOLD) {
      parts.push(`（已发送 ${this.sendCount + 1}/${MAX_SEND_COUNT} 条）`);
    }
    if (this.lastUserMsgTime) {
      const elapsed = Date.now() - this.lastUserMsgTime;
      const remainMin = Math.max(0, Math.round((WINDOW_HOURS * 3600 * 1000 - elapsed) / 60000));
      parts.push(`（窗口剩余约 ${remainMin} 分钟，回复任意消息可重置）`);
    }
    return parts.join('');
  }

  /**
   * 推送后更新计数到数据库
   */
  _incrementSendCount() {
    if (!this.channelId) return;
    try {
      const channel = ChannelModel.findById(this.channelId);
      if (!channel) return;
      channel.config.sendCount = this.sendCount + 1;
      ChannelModel.update(this.channelId, { config: channel.config });
    } catch (err) {
      logger.warn(`渠道 ${this.channelId} 更新 sendCount 失败: ${err.message}`);
    }
  }

  async send(message, { skipReminder = false, skipCount = false } = {}) {
    const { title, content, type = 'text' } = message;
    let text = title ? `${title}\n\n${content}` : content;

    if (type === 'markdown') {
      text = this._stripMarkdown(text);
    } else if (type === 'html') {
      text = this._stripHtml(text);
    }

    // 检查是否需要追加额度提醒
    if (!skipReminder && this._shouldRemind()) {
      text += this._buildRemindText();
    }

    const client = new IlinkClient({ baseUrl: this.baseUrl, token: this.token });
    const result = await client.sendTextMessage({
      toUserId: this.toUserId,
      text,
      contextToken: this.contextToken,
    });

    // 发送成功后递增计数
    if (!skipCount) {
      this._incrementSendCount();
    }

    return result;
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
      }, { skipReminder: true });
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
