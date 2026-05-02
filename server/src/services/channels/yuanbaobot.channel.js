const BaseChannel = require('./base.channel');
const yuanbaobotMonitor = require('../yuanbaobot/yuanbaobot-monitor.js');
const logger = require('../../utils/logger');

/**
 * 元宝 Bot 渠道适配器
 *
 * 配置字段:
 *  - appKey:       应用 Key（元宝开放平台创建 Bot 时获得）
 *  - appSecret:    应用 Secret
 *  - sendTarget:   发送目标：'private'(私聊) | 'group'(群聊)，默认 'private'
 *  - [toUserId]:   绑定后自动填充（用户给 Bot 发消息后从 inbound push 中提取）
 *  - [groupCode]:  收到群消息后自动填充（最新群号，换群时自动更新）
 *  - [apiDomain]:  自定义 API 域名（可选）
 *  - [wsUrl]:      自定义 WebSocket 地址（可选）
 */
class YuabaobotChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.toUserId = config.toUserId || '';
    this.groupCode = config.groupCode || '';
    /** 发送目标：由用户在渠道配置中指定，'private' | 'group' */
    this.sendTarget = config.sendTarget || 'private';
    this.channelId = channelId || null;
  }

  /**
   * 发送消息
   *
   * 发送目标优先级：
   *   1. message.target（调用方显式指定）
   *   2. 渠道配置 sendTarget（用户在界面选择的）
   *
   * @param {{ title?, content, type?, target? }} message
   *        target?: 'group' | 'private' — 调用方显式指定（可选，覆盖配置）
   */
  async send(message) {
    const { title, content, type = 'text', target } = message;
    let text = title ? `${title}\n\n${content}` : content;

    // HTML 标签清理
    if (type === 'html') {
      text = this._stripHtml(text);
    }

    // Markdown 清理（元宝支持部分 markdown，但保险起见做基本处理）
    if (type === 'markdown') {
      // 保留基础 markdown，只做必要清理
    }

    // 获取该 appKey 的 WS Client
    const client = yuanbaobotMonitor.getClient(this.appKey);
    if (!client) {
      throw new Error('元宝 Bot WS 连接未就绪，请检查渠道配置或等待连接建立');
    }

    if (client.getState() !== 'connected') {
      throw new Error(`元宝 Bot WS 未就绪 (state=${client.getState()})，请稍后再试`);
    }

    // 判断发送目标：
    //   1. 调用方显式指定 message.target
    //   2. 渠道配置 sendTarget（用户界面选择）
    const isGroup = (target || this.sendTarget) === 'group';

    if (isGroup) {
      return this._sendGroup(client, text);
    } else {
      return this._sendPrivate(client, text);
    }
  }

  /** 私聊发送 */
  async _sendPrivate(client, text) {
    if (!this.toUserId) {
      throw new Error('元宝 Bot 尚未完成握手绑定，请先在元宝 App 中给你的 Bot 发一条消息');
    }

    logger.info(`[yuanbaobot-channel] 发送私聊消息: to=${this.toUserId}, len=${text.length}, channelId=${this.channelId}`);
    const result = await client.sendText(this.toUserId, text);

    if (result.code !== 0 && result.code !== undefined) {
      throw new Error(result.message || `私聊发送失败 (code=${result.code})`);
    }
    return result;
  }

  /** 群聊发送 */
  async _sendGroup(client, text) {
    if (!this.groupCode) {
      throw new Error('未配置群号 (groupCode)。请在群中 @Bot 发送一条消息以完成群绑定');
    }

    logger.info(`[yuanbaobot-channel] 发送群消息: groupCode=${this.groupCode}, len=${text.length}, channelId=${this.channelId}`);
    const result = await client.sendGroupText(this.groupCode, text);

    if (result.code !== 0 && result.code !== undefined) {
      throw new Error(result.message || `群消息发送失败 (code=${result.code})`);
    }
    return result;
  }

  validate(config) {
    if (!config.appKey || !config.appKey.trim()) {
      return { valid: false, message: 'App Key 不能为空' };
    }
    if (!config.appSecret || !config.appSecret.trim()) {
      return { valid: false, message: 'App Secret 不能为空' };
    }
    return { valid: true, message: '' };
  }

  async test() {
    // 根据发送目标做前置校验
    const isGroup = this.sendTarget === 'group';
    if (!isGroup && !this.toUserId) {
      return {
        success: false,
        message: '尚未完成握手绑定。请在元宝 App 中给 Bot 发送一条消息以完成绑定',
      };
    }
    if (isGroup && !this.groupCode) {
      return {
        success: false,
        message: '尚未绑定群聊。请在群中 @Bot 发送一条消息以绑定群号',
      };
    }

    try {
      await this.send({
        title: '测试消息',
        content: `这是一条来自魔法推送(MagicPush)的${isGroup ? '群' : ''}聊测试消息`,
        type: 'text',
        // 显式指定目标，确保与用户配置一致
        target: isGroup ? 'group' : 'private',
      });
      return { success: true, message: `测试消息发送成功（${isGroup ? '群聊' : '私聊'}）` };
    } catch (error) {
      logger.error('[yuanbaobot-channel] 测试失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return '元宝Bot';
  }

  static getDescription() {
    return '通过腾讯元宝 Bot (WebSocket) 推送消息';
  }

  static getConfigFields(config = {}) {
    const target = config.sendTarget || 'private';
    const hasToUser = !!config.toUserId;
    const hasGroup = !!config.groupCode;

    return [
      {
        name: 'appKey',
        label: 'App Key',
        type: 'text',
        required: true,
        placeholder: '在元宝中创建机器人后获得的 AppID',
        description: '',
      },
      {
        name: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: '在元宝中创建机器人后获得的 AppSecret',
        description: '',
      },
      {
        name: 'sendTarget',
        label: '发送目标',
        type: 'select',
        required: false,
        options: [
          { label: '私聊（默认）', value: 'private' },
          { label: '群聊', value: 'group' },
        ],
        default: 'private',
        description: target === 'group'
          ? (hasGroup ? '\u2705 \u7fa4\u5df2\u7ed1\u5b9a' : '\u26a0\ufe0f \u9700\u8981\u5728\u7fa4\u4e2d @Bot \u4e00\u6761\u6d88\u606f\u4ee5\u7ed1\u5b9a\u7fa4\u53f7')
          : (hasToUser ? '\u2705 \u5df2\u5b8c\u6210\u63e1\u624b\u7ed1\u5b9a' : '\u26a0\ufe0f \u9700\u8981\u5728\u5143\u5b9d App \u7ed9 Bot \u53d1\u4e00\u6761\u6d88\u606f\u4ee5\u5b8c\u6210\u7ed1\u5b9a'),
      },
      {
        name: '_docLinks',
        label: '帮助文档',
        type: 'links',
        required: false,
        links: [
          {
            label: '如何创建元宝 Bot？',
            url: 'https://yuanbao.tencent.com',
          }
        ],
      },
      {
        name: '_bindingHint',
        label: '绑定提示',
        type: 'hint',
        required: false,
        description: '配置完成后，请在元宝 App 中给你的 Bot 发送一条任意消息，系统会自动完成握手绑定。',
      },
    ];
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
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

module.exports = YuabaobotChannel;
