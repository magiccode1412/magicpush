const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * WxPusher适配器
 */
class WxPusherChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.appToken = config.appToken;
    this.uids = config.uids || '';
    this.topicIds = config.topicIds || '';
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let summary = title || content.substring(0, 100);
    if (content.length > 100) {
      summary += '...';
    }

    const payload = {
      appToken: this.appToken,
      summary: summary,
      content: content,
      contentType: type === 'html' ? 2 : type === 'markdown' ? 3 : 1,
    };

    if (this.uids) {
      payload.uids = this.uids.split(',').map(uid => uid.trim()).filter(Boolean);
    }

    if (this.topicIds) {
      payload.topicIds = this.topicIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
    }

    const response = await axios.post('https://wxpusher.zjiecode.com/api/send/message', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (!response.data.success) {
      throw new Error(`WxPusher发送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data && response.data.data[0] ? response.data.data[0].messageId : null,
    };
  }

  validate(config) {
    if (!config.appToken || config.appToken.trim() === '') {
      return { valid: false, message: 'App Token不能为空' };
    }
    if ((!config.uids || config.uids.trim() === '') && (!config.topicIds || config.topicIds.trim() === '')) {
      return { valid: false, message: 'UID和Topic ID至少填写一个' };
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
    return 'WxPusher';
  }

  static getDescription() {
    return 'WxPusher微信推送服务，支持个人微信实时推送';
  }

  static getConfigFields() {
    return [
      {
        name: 'appToken',
        label: 'App Token',
        type: 'text',
        required: true,
        placeholder: '请输入WxPusher App Token',
        description: '从WxPusher官网获取的App Token',
      },
      {
        name: 'uids',
        label: 'UIDs（可选）',
        type: 'text',
        required: false,
        placeholder: '多个UID用逗号分隔',
        description: '关注用户的UID，多个用逗号分隔',
      },
      {
        name: 'topicIds',
        label: 'Topic IDs（可选）',
        type: 'text',
        required: false,
        placeholder: '多个Topic ID用逗号分隔',
        description: '主题ID，用于群推，多个用逗号分隔',
      },
    ];
  }
}

module.exports = WxPusherChannel;
