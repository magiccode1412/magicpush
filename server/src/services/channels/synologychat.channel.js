const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * 群晖 Chat (Synology Chat) 渠道适配器
 *
 * 群晖 Chat 是运行在 Synology NAS DSM 上的即时通讯套件
 * 官网: https://www.synology.com/en-global/dsm/feature/chat
 * KB 文档: https://kb.synology.com/en-global/DSM/tutorial/How_to_use_Synology_Chat_to_send_notifications
 *
 * 发送消息接口: POST {serverUrl}/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token={token}
 * 请求格式: application/x-www-form-urlencoded (payload={"text":"..."} as form field)
 * 鉴权方式: URL query 参数中的 token
 */
class SynologyChatChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.serverUrl - 群晖 DSM 地址（必填，如 https://nas.example.com:5001）
   * @param {string} config.token - Incoming Webhook Token（必填）
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    if (!config.serverUrl || !config.serverUrl.trim()) {
      throw new Error('群晖服务地址不能为空');
    }
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.token = config.token;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type } = message;

    // 拼接标题和内容
    let text;
    if (type === 'markdown') {
      text = title ? `**${title}**\n\n${content}` : content;
    } else if (type === 'html') {
      text = title ? `${title}\n${this._stripHtml(content)}` : this._stripHtml(content);
    } else {
      text = title ? `${title}\n\n${content}` : content;
    }

    // 构建 payload JSON 字符串
    const payload = JSON.stringify({ text });

    // token 需要带引号并 URL 编码
    const encodedToken = encodeURIComponent(`"${this.token}"`);

    // 构建请求 URL
    const url = `${this.serverUrl}/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=${encodedToken}`;

    logger.info(`SynologyChat 发送消息: server=${this.serverUrl}`);

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });

    const data = response.data;

    if (data.error) {
      throw new Error(`群晖 Chat 推送失败 (code=${data.error.code}): ${data.error.message || '未知错误'}`);
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
    if (!config.serverUrl || config.serverUrl.trim() === '') {
      return { valid: false, message: '服务地址不能为空' };
    }
    try {
      new URL(config.serverUrl);
    } catch {
      return { valid: false, message: '服务地址格式不正确' };
    }
    if (!config.token || config.token.trim() === '') {
      return { valid: false, message: 'Token 不能为空' };
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
    return 'synologychat';
  }

  static getDescription() {
    return '群晖 NAS 即时通讯通知（Incoming Webhook）';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: '服务地址',
        type: 'text',
        required: true,
        placeholder: 'https://nas.example.com:5001',
        description: '群晖 DSM 的访问地址，需包含端口（默认 HTTP 5000 / HTTPS 5001）',
      },
      {
        name: 'token',
        label: 'Token',
        type: 'password',
        required: true,
        placeholder: 'Incoming Webhook Token',
        description: '在 Synology Chat 中创建 Incoming Webhook 时生成的 Token',
      },
    ];
  }
}

module.exports = SynologyChatChannel;
