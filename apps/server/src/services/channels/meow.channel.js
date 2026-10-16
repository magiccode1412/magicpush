const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * Meow 渠道适配器
 *
 * Meow 是一款专为鸿蒙系统开发的推送通知应用
 * API 文档: https://www.chuckfang.com/MeoW/api_doc.html
 *
 * 发送消息接口: POST https://api.chuckfang.com/{nickname}
 * 鉴权方式: 通过用户昵称标识，无需 Token
 *
 * 消息类型（原生支持，由 Meow App 渲染，调用方无需转换内容）：
 *   - text     纯文本（默认）
 *   - markdown  Markdown，App 内渲染
 *   - html      HTML，App 内渲染（可配置显示高度 htmlHeight）
 *
 * 渠道特有参数（来自 extraData.meow 命名空间）：
 *   - title       Meow 单独标题（可选，缺省回退顶层 title）
 *   - content     Meow 单独内容（可选，缺省回退顶层 content）
 *   - url        点击消息的跳转链接
 *   - imgUrl     通知图标 URL（建议 216×216 PNG）
 *   - htmlHeight HTML 消息显示高度（仅 msgType=html 时生效，默认 200）
 *
 * 设计要点：ExtraData.meow 是「自包含」命名空间。当顶层 type=text（纯文本）
 * 但希望 Meow 渲染独立 markdown/html 时，可同时写入 channelType 与 title/content，
 * 使 Meow 携带与其它渠道不同的内容（与 wecomapp 的 news/mpnews 一致）。
 */
class MeowChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.nickname - 用户昵称
   * @param {string} [config.msgType] - 默认消息类型 text/markdown/html，默认 text
   * @param {number} [config.htmlHeight] - 默认 HTML 显示高度，默认 200
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.nickname = config.nickname;
    this.msgType = config.msgType || 'text';
    this.htmlHeight = config.htmlHeight != null ? Number(config.htmlHeight) : 200;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text', channelType, extraData } = message;

    // channelType 优先（来自 extraData.meow.channelType），与全局 type 解耦，
    // 多渠道推送时可为 Meow 单独指定渲染类型而不影响其他渠道。
    if (channelType) {
      return await this.sendChannelSpecific(channelType, { title, content, extraData });
    }

    // 通用分支：消息类型由本次消息 type 决定，回退到渠道配置，默认 text。
    const msgType = ['text', 'markdown', 'html'].includes(type)
      ? type
      : (this.msgType || 'text');

    return await this._deliver(msgType, { title, content, extraData });
  }

  /**
   * 处理渠道特有类型的消息（与全局 type 解耦）
   * @param {string} channelType - 来自 extraData.meow.channelType 的渲染类型
   * @param {Object} data - { title, content, extraData }
   */
  async sendChannelSpecific(channelType, data) {
    const allowed = ['text', 'markdown', 'html'];
    if (!allowed.includes(channelType)) {
      throw new Error(`不支持的 Meow 渠道特有类型: ${channelType}`);
    }
    // 特定分支同样合并 url/imgUrl/htmlHeight 参数并校验业务状态码。
    return await this._deliver(channelType, data);
  }

  /**
   * 统一投递方法：合并渠道特有参数、发起 POST 请求并校验业务状态码。
   * @param {string} msgType - text / markdown / html
   * @param {Object} payload - { title, content, extraData }
   */
  async _deliver(msgType, { title, content, extraData }) {
    const ns = extraData || {};
    // 命名空间内的 title/content 优先：多渠道推送时为 Meow 携带独立内容，
    // 未提供时回退到全局顶层 title/content（向后兼容现有调用方式）。
    const meowTitle = ns.title != null ? ns.title : title;
    const meowContent = ns.content != null ? ns.content : content;
    const url = ns.url || '';
    const imgUrl = ns.imgUrl || '';
    // htmlHeight 优先使用本次推送 extraData 覆盖，否则回退渠道配置默认，最后回退规范默认 200。
    const htmlHeight = ns.htmlHeight != null ? Number(ns.htmlHeight) : this.htmlHeight;

    // msgType 与 htmlHeight 为请求参数（query），符合官方规范。
    const params = { msgType };
    // htmlHeight 仅在 msgType=html 时生效（符合官方规范）。
    if (msgType === 'html') params.htmlHeight = htmlHeight;

    // url/imgUrl 放入 JSON body：官方 application/json 示例中 url/imgUrl 位于 body，
    // 且文档明确「Body 优先」；放入 query 在 JSON 模式下不会被 App 读取。
    const body = {
      title: meowTitle || undefined,
      msg: meowContent,
    };
    if (url) body.url = url;
    if (imgUrl) body.imgUrl = imgUrl;

    logger.info(`Meow 发送消息: nickname=${this.nickname}, msgType=${msgType}, htmlHeight=${htmlHeight}`);
    const response = await axios.post(
      `https://api.chuckfang.com/${encodeURIComponent(this.nickname)}`,
      body,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const data = response.data || {};
    if (data.status && data.status !== 200) {
      throw new Error(`Meow 推送失败 (${data.status}): ${data.msg || data.message || '未知错误'}`);
    }

    return data;
  }

  validate(config) {
    if (!config.nickname || config.nickname.trim() === '') {
      return { valid: false, message: '用户昵称不能为空' };
    }
    if (config.nickname.includes('/')) {
      return { valid: false, message: '用户昵称不能包含斜杠' };
    }
    if (config.msgType && !['text', 'markdown', 'html'].includes(config.msgType)) {
      return { valid: false, message: '消息类型只支持 text、markdown 或 html' };
    }
    if (config.htmlHeight != null && config.htmlHeight !== '') {
      const h = Number(config.htmlHeight);
      if (!Number.isInteger(h) || h <= 0) {
        return { valid: false, message: 'HTML 高度必须为正整数' };
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
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'Meow';
  }

  static getDescription() {
    return '鸿蒙系统推送通知应用';
  }

  static getSupportedTypes() {
    return ['text', 'markdown', 'html'];
  }

  static getChannelSpecificTypes() {
    return [
      {
        value: 'text',
        label: '纯文本（Meow 专属）',
        description: '按渠道单独指定文本渲染，覆盖全局 type',
      },
      {
        value: 'markdown',
        label: 'Markdown（Meow 专属）',
        description: '按渠道单独指定，原样透传由 App 渲染',
      },
      {
        value: 'html',
        label: 'HTML（Meow 专属）',
        description: '按渠道单独指定，App 内渲染 HTML',
      },
    ];
  }

  static getConfigFields() {
    return [
      {
        name: 'nickname',
        label: '用户昵称',
        type: 'text',
        required: true,
        placeholder: '在 Meow App 中设置的昵称',
        description: '用于标识推送目标的用户昵称',
      },
      {
        name: 'msgType',
        label: '默认消息类型',
        type: 'select',
        required: false,
        defaultValue: 'text',
        options: [
          { label: '纯文本', value: 'text' },
          { label: 'Markdown', value: 'markdown' },
          { label: 'HTML', value: 'html' },
        ],
        description: 'text=纯文本显示，markdown=在App中渲染Markdown，html=在App中渲染HTML（多渠道推送时可在 extraData.meow.channelType 单独覆盖）',
      },
      {
        name: 'htmlHeight',
        label: 'HTML 显示高度',
        type: 'number',
        required: false,
        defaultValue: 200,
        min: 1,
        description: '仅当消息类型为 HTML 时生效，单位为像素，默认 200',
      },
      {
        name: '_docLinks',
        label: '官方文档',
        type: 'links',
        required: false,
        links: [
          {
            label: 'MeoW API 文档',
            url: 'https://www.chuckfang.com/MeoW/api_doc.html',
          },
        ],
      },
    ];
  }
}

module.exports = MeowChannel;
