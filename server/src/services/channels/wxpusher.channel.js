const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * WxPusher适配器
 * 支持两种推送方式：
 *   - 标准推送：通过 appToken + uid/topicId 推送，适合开发者给用户推送
 *   - 极简推送(SPT)：通过 spt 推送，适合自己给自己推送，无需创建应用
 * 官方文档: https://wxpusher.zjiecode.com/docs/
 */
class WxPusherChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.mode = config.mode || 'standard';
    this.appToken = config.appToken;
    this.uids = config.uids || '';
    this.topicIds = config.topicIds || '';
    this.spt = config.spt || '';
    this.sptList = config.sptList || '';
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    let summary = title || content.substring(0, 100);
    if (content.length > 100) {
      summary += '...';
    }

    if (this.mode === 'spt') {
      return this._sendSpt(summary, content, type);
    }
    return this._sendStandard(summary, content, type);
  }

  /**
   * 标准推送
   */
  async _sendStandard(summary, content, type) {
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

  /**
   * 极简推送(SPT)
   */
  async _sendSpt(summary, content, type) {
    const payload = {
      content: content,
      contentType: type === 'html' ? 2 : type === 'markdown' ? 3 : 1,
    };

    if (summary && summary !== content.substring(0, 100)) {
      payload.summary = summary;
    }

    // spt 和 sptList 二选一：有 sptList 时优先使用，否则使用 spt
    if (this.sptList) {
      const list = this.sptList.split(',').map(s => s.trim()).filter(Boolean);
      if (list.length > 0) {
        payload.sptList = list;
      } else if (this.spt) {
        payload.spt = this.spt;
      }
    } else if (this.spt) {
      payload.spt = this.spt;
    }

    const response = await axios.post('https://wxpusher.zjiecode.com/api/send/message/simple-push', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (!response.data.success) {
      throw new Error(`WxPusher极简推送失败: ${response.data.msg}`);
    }

    return {
      success: true,
      messageId: response.data.data && response.data.data[0] ? response.data.data[0].messageId : null,
    };
  }

  validate(config) {
    if (config.mode === 'spt') {
      const hasSpt = config.spt && config.spt.trim() !== '';
      const hasSptList = config.sptList && config.sptList.trim() !== '';
      if (!hasSpt && !hasSptList) {
        return { valid: false, message: 'SPT和SPT列表至少需要填写一个' };
      }
      if (hasSpt && hasSptList) {
        return { valid: false, message: 'SPT和SPT列表只能二选一，请勿同时填写' };
      }
      if (hasSptList) {
        const list = config.sptList.split(',').map(s => s.trim()).filter(Boolean);
        if (list.length > 10) {
          return { valid: false, message: 'SPT列表最多不能超过10个' };
        }
      }
      return { valid: true, message: '' };
    }

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
    return 'WxPusher微信推送服务，支持标准推送和极简推送(SPT)';
  }

  static getConfigFields() {
    return [
      {
        name: 'mode',
        label: '推送方式',
        type: 'select',
        required: true,
        options: [
          { value: 'standard', label: '标准推送' },
          { value: 'spt', label: '极简推送 (SPT)' },
        ],
        description: '标准推送适合开发者给用户推送；极简推送适合自己给自己推送，无需创建应用',
      },
      {
        name: 'docs_link',
        type: 'links',
        links: [
          { label: 'WxPusher 官方文档', url: 'https://wxpusher.zjiecode.com/docs/' },
        ],
      },
      {
        name: 'appToken',
        label: 'App Token',
        type: 'text',
        required: true,
        placeholder: '请输入WxPusher App Token',
        description: '从WxPusher管理后台获取的App Token',
        visibleWhen: { field: 'mode', value: 'standard' },
      },
      {
        name: 'uids',
        label: 'UIDs（可选）',
        type: 'text',
        required: false,
        placeholder: '多个UID用逗号分隔',
        description: '关注用户的UID，多个用逗号分隔',
        visibleWhen: { field: 'mode', value: 'standard' },
      },
      {
        name: 'topicIds',
        label: 'Topic IDs（可选）',
        type: 'text',
        required: false,
        placeholder: '多个Topic ID用逗号分隔',
        description: '主题ID，用于群推，多个用逗号分隔',
        visibleWhen: { field: 'mode', value: 'standard' },
      },
      {
        name: 'spt',
        label: 'SPT',
        type: 'text',
        required: false,
        placeholder: '请输入SPT，如 SPT_xxxxxx',
        description: '与SPT列表二选一：填写单个SPT用于个人推送',
        visibleWhen: { field: 'mode', value: 'spt' },
      },
      {
        name: 'sptList',
        label: 'SPT 列表',
        type: 'text',
        required: false,
        placeholder: '多个SPT用逗号分隔，最多10个',
        description: '与SPT二选一：填写多个SPT用于群推，多个用逗号分隔，最多不能超过10个',
        visibleWhen: { field: 'mode', value: 'spt' },
      },
    ];
  }
}

module.exports = WxPusherChannel;
