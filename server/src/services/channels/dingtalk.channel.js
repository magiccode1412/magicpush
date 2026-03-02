const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * 钉钉机器人适配器
 */
class DingtalkChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.webhookUrl = config.webhookUrl;
    this.secret = config.secret || '';
  }

  /**
   * 生成钉钉签名
   */
  generateSign(timestamp) {
    if (!this.secret) return '';
    
    const crypto = require('crypto');
    const stringToSign = `${timestamp}\n${this.secret}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(stringToSign);
    const signature = hmac.digest('base64');
    return encodeURIComponent(signature);
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let payload;

    if (type === 'markdown') {
      payload = {
        msgtype: 'markdown',
        markdown: {
          title: title || '消息通知',
          text: title ? `# ${title}\n${content}` : content,
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

    let url = this.webhookUrl;
    
    // 如果有密钥，添加签名
    if (this.secret) {
      const timestamp = Date.now();
      const sign = this.generateSign(timestamp);
      url = `${url}&timestamp=${timestamp}&sign=${sign}`;
    }

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`钉钉发送失败: ${response.data.errmsg}`);
    }

    return {
      success: true,
      messageId: null, // 钉钉不返回消息ID
    };
  }

  validate(config) {
    if (!config.webhookUrl || config.webhookUrl.trim() === '') {
      return { valid: false, message: 'Webhook地址不能为空' };
    }
    if (!config.webhookUrl.startsWith('https://oapi.dingtalk.com/robot/send')) {
      return { valid: false, message: 'Webhook地址格式不正确' };
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
    return '钉钉';
  }

  static getDescription() {
    return '钉钉群机器人，支持文本和Markdown消息';
  }

  static getConfigFields() {
    return [
      {
        name: 'webhookUrl',
        label: 'Webhook地址',
        type: 'text',
        required: true,
        placeholder: '请输入钉钉机器人Webhook地址',
        description: '在钉钉群中添加自定义机器人后获取的Webhook地址',
      },
      {
        name: 'secret',
        label: 'Secret密钥（可选）',
        type: 'text',
        required: false,
        placeholder: '如有加签请输入Secret',
        description: '安全设置选择"加签"时的密钥',
      },
    ];
  }
}

module.exports = DingtalkChannel;
