const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * 飞书机器人适配器
 */
class FeishuChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.webhookUrl = config.webhookUrl;
    this.secret = config.secret || '';
  }

  /**
   * 生成飞书签名
   */
  generateSign(timestamp) {
    if (!this.secret) return '';
    
    const crypto = require('crypto');
    const stringToSign = `${timestamp}\n${this.secret}`;
    const hmac = crypto.createHmac('sha256', stringToSign);
    const signature = hmac.digest('base64');
    return signature;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let payload;
    const timestamp = Math.floor(Date.now() / 1000);

    if (type === 'markdown') {
      payload = {
        timestamp: timestamp,
        sign: this.generateSign(timestamp),
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: title || '消息通知',
            },
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: content,
              },
            },
          ],
        },
      };
    } else {
      // text类型
      const text = title ? `${title}\n\n${content}` : content;
      payload = {
        timestamp: timestamp,
        sign: this.generateSign(timestamp),
        msg_type: 'text',
        content: {
          text: text,
        },
      };
    }

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.code !== 0) {
      throw new Error(`飞书发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data ? response.data.data.message_id : null,
    };
  }

  validate(config) {
    if (!config.webhookUrl || config.webhookUrl.trim() === '') {
      return { valid: false, message: 'Webhook地址不能为空' };
    }
    if (!config.webhookUrl.startsWith('https://open.feishu.cn/open-apis/bot/v2/hook/')) {
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
    return '飞书';
  }

  static getDescription() {
    return '飞书群机器人，支持文本和卡片消息';
  }

  static getConfigFields() {
    return [
      {
        name: 'webhookUrl',
        label: 'Webhook地址',
        type: 'text',
        required: true,
        placeholder: '请输入飞书机器人Webhook地址',
        description: '在飞书群中添加自定义机器人后获取的Webhook地址',
      },
      {
        name: 'secret',
        label: 'Secret密钥（可选）',
        type: 'text',
        required: false,
        placeholder: '如有签名校验请输入Secret',
        description: '启用签名校验时的密钥',
      },
    ];
  }
}

module.exports = FeishuChannel;
