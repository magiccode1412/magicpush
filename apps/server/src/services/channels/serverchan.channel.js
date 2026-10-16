const axios = require('axios');
const BaseChannel = require('./base.channel');

/**
 * Server酱适配器
 * 支持两个版本：
 *   - Turbo版 (SCT): https://sct.ftqq.com/
 *   - ³版 (SC3): https://sc3.ft07.com/
 */
class ServerChanChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.version = config.version || 'turbo';
    this.sendKey = config.sendKey;
    this.apiUrl = this._buildApiUrl();
  }

  /**
   * 根据版本构建API地址
   */
  _buildApiUrl() {
    if (this.version === 'v3') {
      // SC3版URL格式: https://{uid}.push.ft07.com/send/{sendkey}.send
      // uid从sendkey中提取，位于sctp{uid}t...处
      const match = String(this.sendKey).match(/^sctp(\d+)t/);
      if (!match) {
        throw new Error('³版SendKey格式错误，应以sctp开头，如 sctp{uid}t...');
      }
      return `https://${match[1]}.push.ft07.com/send/${this.sendKey}.send`;
    }
    // Turbo版URL格式: https://sctapi.ftqq.com/{sendKey}.send
    return `https://sctapi.ftqq.com/${this.sendKey}.send`;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    const messageTitle = title || '通知';
    let desp = content;
    if (type === 'markdown' || type === 'html') {
      desp = content;
    }

    let response;
    if (this.version === 'v3') {
      response = await this._sendV3(messageTitle, desp);
    } else {
      response = await this._sendTurbo(messageTitle, desp);
    }

    if (response.data.code !== 0) {
      throw new Error(`Server酱发送失败: ${response.data.message}`);
    }

    return {
      success: true,
      messageId: response.data.data?.pushid,
    };
  }

  /**
   * Turbo版发送逻辑
   */
  async _sendTurbo(title, desp) {
    const payload = { title, desp };
    if (this.config.channel) {
      payload.channel = this.config.channel;
    }
    if (this.config.openid) {
      payload.openid = this.config.openid;
    }
    if (this.config.noip) {
      payload.noip = this.config.noip;
    }

    return axios.post(this.apiUrl, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
      transformRequest: [(data) => {
        const params = new URLSearchParams();
        for (const key in data) {
          params.append(key, data[key]);
        }
        return params.toString();
      }],
    });
  }

  /**
   * ³版发送逻辑
   */
  async _sendV3(title, desp) {
    const payload = { title, desp };
    if (this.config.tags) {
      payload.tags = this.config.tags;
    }
    if (this.config.short) {
      payload.short = this.config.short;
    }

    return axios.post(this.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      timeout: 10000,
    });
  }

  validate(config) {
    if (!config.sendKey || config.sendKey.trim() === '') {
      return { valid: false, message: 'SendKey不能为空' };
    }
    if (config.version === 'v3') {
      const match = String(config.sendKey).match(/^sctp(\d+)t/);
      if (!match) {
        return { valid: false, message: '³版SendKey格式应为 sctp{uid}t...，如 sctp3289tabcdef' };
      }
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
    return 'Server酱';
  }

  static getDescription() {
    return 'Server酱微信推送服务，将消息推送到微信（支持Turbo版和³版）';
  }

  static getConfigFields() {
    return [
      {
        name: 'version',
        label: '版本',
        type: 'select',
        required: true,
        options: [
          { value: 'turbo', label: 'Turbo版 (SCT)' },
          { value: 'v3', label: '³版 (SC3)' },
        ],
        description: '选择Server酱版本，两者接口和参数不同',
      },
      {
        name: 'turbo_link',
        type: 'links',
        links: [
          { label: 'Turbo版官网', url: 'https://sct.ftqq.com/' },
        ],
        visibleWhen: { field: 'version', value: 'turbo' },
      },
      {
        name: 'v3_link',
        type: 'links',
        links: [
          { label: '³版官网', url: 'https://sc3.ft07.com/' },
        ],
        visibleWhen: { field: 'version', value: 'v3' },
      },
      {
        name: 'sendKey',
        label: 'SendKey',
        type: 'text',
        required: true,
        placeholder: '请输入Server酱SendKey',
        description: 'Turbo版以SCT开头；³版格式为 sctp{uid}t...（如 sctp3289tabcdef）',
      },
      {
        name: 'channel',
        label: '推送渠道',
        type: 'text',
        required: false,
        placeholder: '可选，如：9',
        description: '指定推送渠道，如9=Android，留空使用默认渠道',
        visibleWhen: { field: 'version', value: 'turbo' },
      },
      {
        name: 'openid',
        label: '抄送OpenID',
        type: 'text',
        required: false,
        placeholder: '可选',
        description: '消息抄送的openid，多个用逗号或竖线分隔',
        visibleWhen: { field: 'version', value: 'turbo' },
      },
      {
        name: 'noip',
        label: '隐藏调用IP',
        type: 'switch',
        required: false,
        description: '是否隐藏调用者IP，开启后不显示IP',
        visibleWhen: { field: 'version', value: 'turbo' },
      },
      {
        name: 'tags',
        label: '标签',
        type: 'text',
        required: false,
        placeholder: '可选，如：服务器报警|报告',
        description: '标签列表，多个标签使用竖线分隔',
        visibleWhen: { field: 'version', value: 'v3' },
      },
      {
        name: 'short',
        label: '简短描述',
        type: 'text',
        required: false,
        placeholder: '可选',
        description: '消息卡片中展示的简短描述，适合desp为markdown时使用',
      },
    ];
  }
}

module.exports = ServerChanChannel;
