const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * PushPlus适配器
 */
class PushPlusChannel extends BaseChannel {
  constructor(config, channelKey) {
    super(config, channelKey);
    this.token = config.token;
    this.topic = config.topic || '';
  }

  /**
   * 通用 type → PushPlus template 映射
   * text→txt, markdown→markdown, html→html（兜底 html）
   */
  _mapTemplate(type) {
    if (type === 'markdown') return 'markdown';
    if (type === 'html') return 'html';
    return 'txt';
  }

  async send(message) {
    const { title, content, type = 'text', channelType, extraData } = message;

    // 有 channelType → 走可选参数分支（extraData 自包含：类型 + 全部可选字段）
    if (channelType) {
      // 命名空间内的 title/content/type 可覆盖顶层（多渠道独立内容），其余可选字段透传
      return await this.sendChannelSpecific(channelType, {
        title,
        content,
        type,
        ...(extraData || {}),
      });
    }

    const template = this._mapTemplate(type);

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

  /**
   * 处理渠道特有类型（合成类型 custom：使用 PushPlus /send 全部可选参数）
   */
  async sendChannelSpecific(channelType, extraData) {
    switch (channelType) {
      case 'custom':
        return await this.sendCustom(extraData);
      default:
        throw new Error(`不支持的 PushPlus 特有类型: ${channelType}`);
    }
  }

  /**
   * 使用 PushPlus 完整可选参数发送
   * 支持字段：template, channel, option, callbackUrl, timestamp, pre, topic
   * 文档: https://www.pushplus.plus/push1.html
   */
  async sendCustom(data) {
    if (!data) {
      throw new Error('PushPlus 可选参数数据不能为空');
    }

    const payload = {
      token: this.token,
      title: data.title || '消息通知',
      content: data.content,
      // template 优先取 extraData 指定，否则回退通用 type 映射
      template: data.template || this._mapTemplate(data.type || 'text'),
    };

    // 发送渠道（如 webhook / mail / sms / voice 等）
    if (data.channel) {
      payload.channel = data.channel;
    }

    // 渠道配置参数：object 序列化为字符串，string 原样透传，空则不传
    if (data.option !== undefined && data.option !== null) {
      payload.option = typeof data.option === 'string'
        ? data.option
        : JSON.stringify(data.option);
    }

    // 异步回调地址
    if (data.callbackUrl) {
      payload.callbackUrl = data.callbackUrl;
    }

    // 群组编码：extraData 优先，否则用渠道配置 topic
    if (data.topic || this.topic) {
      payload.topic = data.topic || this.topic;
    }

    // 时间戳（毫秒）：小于当前时间消息将不发送
    if (data.timestamp !== undefined && data.timestamp !== null) {
      payload.timestamp = Number(data.timestamp);
    }

    // 预处理编码（仅会员可用）
    if (data.pre) {
      payload.pre = data.pre;
    }

    logger.info(`PushPlus 发送(可选参数): template=${payload.template}, channel=${payload.channel || 'default'}`);

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
      type: 'custom',
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
    return 'PushPlus推送服务，支持微信、短信、邮件、Webhook等多渠道，可选参数方式支持完整推送能力';
  }

  static getSupportedTypes() {
    return ['text', 'markdown', 'html'];
  }

  static getChannelSpecificTypes() {
    return [
      {
        value: 'custom',
        label: '完整参数推送',
        icon: '⚙️',
        description: '使用 PushPlus /send 的全部可选参数（template、channel、option、callbackUrl 等）',
        fields: [
          {
            name: 'template',
            label: '消息模板',
            type: 'select',
            required: false,
            options: [
              { value: 'html', label: 'HTML' },
              { value: 'txt', label: '纯文本' },
              { value: 'json', label: 'JSON 可视化' },
              { value: 'markdown', label: 'Markdown' },
              { value: 'cloudMonitor', label: '阿里云监控' },
              { value: 'jenkins', label: 'Jenkins' },
              { value: 'route', label: '路由器' },
              { value: 'pay', label: '支付成功' },
            ],
            description: '不填则根据通用 type 自动推导（text→txt / markdown→markdown / html→html）',
          },
          {
            name: 'channel',
            label: '发送渠道',
            type: 'select',
            required: false,
            options: [
              { value: 'wechat', label: '微信服务号(默认)' },
              { value: 'app', label: 'App' },
              { value: 'extension', label: '浏览器插件/桌面应用' },
              { value: 'webhook', label: '第三方 Webhook' },
              { value: 'clawbot', label: '微信 ClawBot' },
              { value: 'cp', label: '企业微信应用' },
              { value: 'mail', label: '邮件' },
              { value: 'sms', label: '短信(收费)' },
              { value: 'voice', label: '语音(收费)' },
            ],
          },
          {
            name: 'option',
            label: '渠道配置参数(option)',
            type: 'json',
            required: false,
            description: 'JSON 对象，如 webhook 渠道的 {"url":"...","key":"..."}，自动序列化为字符串',
          },
          {
            name: 'callbackUrl',
            label: '回调地址',
            type: 'url',
            required: false,
            description: '异步回调发送结果',
          },
          {
            name: 'topic',
            label: '群组编码(topic)',
            type: 'text',
            required: false,
            description: '覆盖渠道配置中的 topic 进行群推',
          },
          {
            name: 'timestamp',
            label: '时间戳(毫秒)',
            type: 'number',
            required: false,
            description: '小于当前时间消息将不发送',
          },
          {
            name: 'pre',
            label: '预处理编码',
            type: 'text',
            required: false,
            description: '仅会员可用，需个人中心先添加预处理代码',
          },
        ],
        example: {
          title: '服务器告警',
          content: '磁盘使用率已达 98%',
          type: 'text',
          extraData: {
            pushplus: {
              channelType: 'custom',
              template: 'markdown',
              channel: 'webhook',
              option: { url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx' },
              callbackUrl: 'https://example.com/callback',
            },
          },
        },
      },
    ];
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
      {
        name: '_docLinks',
        label: '官方文档',
        type: 'links',
        required: false,
        links: [
          {
            label: '访问 PushPlus 官网获取 Token',
            url: 'https://www.pushplus.plus/',
          },
        ],
      },
    ];
  }
}

module.exports = PushPlusChannel;
