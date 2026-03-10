const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * Telegram Bot适配器
 */
class TelegramChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.apiUrl = `https://api.telegram.org/bot${config.botToken}`;
    this.chatId = config.chatId;
    this.proxyUrl = config.proxyUrl;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let text;
    if (type === 'markdown' || type === 'html') {
      text = title ? `*${title}*\n\n${content}` : content;
    } else {
      text = title ? `<b>${title}</b>\n\n${content}` : content;
    }

    const parseMode = type === 'markdown' ? 'Markdown' : 'HTML';

    const payload = {
      chat_id: this.chatId,
      text: text,
      parse_mode: parseMode,
    };

    const axiosConfig = {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };

    // 如果配置了代理，使用代理Agent
    const proxyAgent = this.createProxyAgent(this.proxyUrl);
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }

    const response = await axios.post(`${this.apiUrl}/sendMessage`, payload, axiosConfig);

    if (!response.data.ok) {
      throw new Error(`Telegram发送失败: ${response.data.description}`);
    }

    return {
      success: true,
      messageId: response.data.result.message_id,
    };
  }

  validate(config) {
    if (!config.botToken || config.botToken.trim() === '') {
      return { valid: false, message: 'Bot Token不能为空' };
    }
    if (!config.chatId || config.chatId.trim() === '') {
      return { valid: false, message: 'Chat ID不能为空' };
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
      return { success: true, message: '连接测试成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'Telegram';
  }

  static getDescription() {
    return 'Telegram Bot，支持文本、Markdown和HTML消息';
  }

  static getConfigFields() {
    return [
      {
        name: 'botToken',
        label: 'Bot Token',
        type: 'text',
        required: true,
        placeholder: '请输入Telegram Bot Token',
        description: '从@BotFather获取的Bot Token',
      },
      {
        name: 'chatId',
        label: 'Chat ID',
        type: 'text',
        required: true,
        placeholder: '请输入Chat ID',
        description: '目标聊天ID（用户ID或群组ID）',
      },
      {
        name: 'proxyUrl',
        label: '代理地址',
        type: 'text',
        required: false,
        placeholder: '如 http://127.0.0.1:7890',
        description: '可选，用于访问Telegram API的代理地址',
      },
    ];
  }
}

module.exports = TelegramChannel;
