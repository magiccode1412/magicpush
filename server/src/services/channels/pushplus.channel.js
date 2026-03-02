const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * PushPlus适配器
 */
class PushPlusChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.token = config.token;
    this.topic = config.topic || '';
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    const template = type === 'html' ? 'html' : type === 'markdown' ? 'markdown' : 'txt';

    const payload = {
      token: this.token,
      title: title || '消息通知',
      content: content,
      template: template,
    };

    if (this.topic) {
      payload.topic = this.topic;
    }

    const response = await axios.post('https://www.pushplus.plus/send', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.code !== 200) {
      throw new Error(`PushPlus发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data,
    };
  }

  validate(config) {
    if (!config.token || config.token.trim() === '') {
      return { valid: false, message: 'Token不能为空' };
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
    return 'PushPlus';
  }

  static getDescription() {
    return 'PushPlus推送服务，支持微信、短信、邮件等多渠道';
  }

  static getConfigFields() {
    return [
      {
        name: 'token',
        label: 'Token',
        type: 'text',
        required: true,
        placeholder: '请输入PushPlus Token',
        description: '从PushPlus官网获取的Token',
      },
      {
        name: 'topic',
        label: 'Topic（可选）',
        type: 'text',
        required: false,
        placeholder: '请输入群组编码（可选）',
        description: '群组编码，用于群推消息',
      },
    ];
  }
}

module.exports = PushPlusChannel;
