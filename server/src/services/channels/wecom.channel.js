const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * 企业微信机器人适配器
 */
class WecomChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${config.key}`;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let payload;

    if (type === 'markdown') {
      payload = {
        msgtype: 'markdown',
        markdown: {
          content: title ? `# ${title}\n${content}` : content,
        },
      };
    } else {
      // text类型
      const text = title ? `${title}\n\n${content}` : content;
      payload = {
        msgtype: 'text',
        text: {
          content: text,
        },
      };
    }

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信发送失败: ${response.data.errmsg}`);
    }

    return {
      success: true,
      messageId: response.data.msgid,
    };
  }

  validate(config) {
    if (!config.key || config.key.trim() === '') {
      return { valid: false, message: '机器人Key不能为空' };
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
    return '企业微信';
  }

  static getDescription() {
    return '企业微信群机器人，支持文本和Markdown消息';
  }

  static getConfigFields() {
    return [
      {
        name: 'key',
        label: '机器人Key',
        type: 'text',
        required: true,
        placeholder: '请输入企业微信机器人Key',
        description: '在企业微信群中添加机器人后获取的Key',
      },
    ];
  }
}

module.exports = WecomChannel;
