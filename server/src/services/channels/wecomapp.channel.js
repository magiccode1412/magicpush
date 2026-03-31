
const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * 企业微信应用消息渠道适配器
 *
 * 通过企业微信自建应用向指定成员推送消息
 * API 文档: https://developer.work.weixin.qq.com/document/path/90236
 *
 * 发送消息接口: POST https://qyapi.weixin.qq.com/cgi-bin/message/send
 * 鉴权方式: access_token（通过 corpid + corpsecret 获取，7200秒有效期）
 */
class WecomappChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.corpid - 企业 ID
   * @param {string} config.corpsecret - 应用凭证密钥
   * @param {number} config.agentid - 应用 AgentId
   * @param {string} config.touser - 接收成员 ID（多个用 | 分隔）或 @all
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.corpid = config.corpid;
    this.corpsecret = config.corpsecret;
    this.agentid = parseInt(config.agentid);
    this.touser = config.touser;
    this.channelId = channelId;
    this._tokenCache = { token: null, expiresAt: 0 };
  }

  async _getAccessToken() {
    const now = Date.now();
    // 提前 5 分钟刷新，避免边界情况
    if (this._tokenCache.token && now < this._tokenCache.expiresAt - 300000) {
      return this._tokenCache.token;
    }

    logger.info(`企业微信应用获取 access_token: corpid=${this.corpid}`);
    const response = await axios.get(
      'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
      {
        params: { corpid: this.corpid, corpsecret: this.corpsecret },
        timeout: 10000,
      }
    );

    const data = response.data;
    if (data.errcode !== 0) {
      throw new Error(`获取企业微信access_token失败: [${data.errcode}] ${data.errmsg}`);
    }

    this._tokenCache = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };

    return data.access_token;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    const accessToken = await this._getAccessToken();

    const body = {
      touser: this.touser,
      agentid: this.agentid,
    };

    if (type === 'markdown') {
      body.msgtype = 'markdown';
      const mdContent = title ? `## ${title}\n${content}` : content;
      body.markdown = { content: mdContent };
    } else {
      body.msgtype = 'text';
      let text = content;
      if (type === 'html') {
        text = this._stripHtml(content);
      }
      const fullText = title ? `${title}\n\n${text}` : text;
      body.text = { content: fullText };
    }

    logger.info(`企业微信应用发送消息: touser=${this.touser}, msgtype=${body.msgtype}`);
    const response = await axios.post(
      'https://qyapi.weixin.qq.com/cgi-bin/message/send',
      body,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (data.errcode !== 0) {
      // token 失效时清除缓存，下次自动重新获取
      if (data.errcode === 42001 || data.errcode === 40014) {
        this._tokenCache = { token: null, expiresAt: 0 };
      }
      throw new Error(`企业微信应用消息发送失败: [${data.errcode}] ${data.errmsg}`);
    }

    return { success: true, messageId: data.msgid };
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
    if (!config.corpid || config.corpid.trim() === '') {
      return { valid: false, message: '企业 ID 不能为空' };
    }
    if (!config.corpsecret || config.corpsecret.trim() === '') {
      return { valid: false, message: '应用 Secret 不能为空' };
    }
    if (!config.agentid || config.agentid.trim() === '') {
      return { valid: false, message: '应用 AgentId 不能为空' };
    }
    const aid = parseInt(config.agentid);
    if (isNaN(aid)) {
      return { valid: false, message: '应用 AgentId 必须是数字' };
    }
    if (!config.touser || config.touser.trim() === '') {
      return { valid: false, message: '接收成员不能为空' };
    }
    if (config.touser.includes('/') || config.touser.includes('\\')) {
      return { valid: false, message: '接收成员格式不正确，多个成员用 | 分隔' };
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
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return '企业微信应用';
  }

  static getDescription() {
    return '企业微信自建应用消息推送';
  }

  static getConfigFields() {
    return [
      {
        name: 'corpid',
        label: '企业 ID',
        type: 'text',
        required: true,
        placeholder: '在企业微信管理后台「我的企业」页面获取',
        description: '企业微信企业唯一标识（corpid）',
      },
      {
        name: 'corpsecret',
        label: '应用 Secret',
        type: 'password',
        required: true,
        placeholder: '在应用详情页获取',
        description: '自建应用的凭证密钥，每个应用独立',
      },
      {
        name: 'agentid',
        label: '应用 AgentId',
        type: 'number',
        required: true,
        placeholder: '在应用详情页获取',
        description: '企业应用 ID（整型）',
      },
      {
        name: 'touser',
        label: '接收成员',
        type: 'text',
        required: true,
        placeholder: '成员ID（多个用 | 分隔）或 @all',
        description: '消息接收者成员 ID，多个用 | 分隔；填 @all 推送应用可见范围内的全部成员',
      },
    ];
  }
}

module.exports = WecomappChannel;
