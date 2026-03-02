const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * Webhook 渠道适配器
 * 支持自定义 URL、Headers 和 Body 模板
 */
class WebhookChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.url = config.url;
    this.method = (config.method || 'POST').toUpperCase();
    this.headers = config.headers || {};
    this.bodyTemplate = config.bodyTemplate || '';
  }

  /**
   * 渲染 Body 模板
   * 支持变量: {{title}}, {{content}}, {{type}}, {{timestamp}}
   */
  renderBody(message) {
    if (!this.bodyTemplate) {
      // 默认 JSON 格式
      return {
        title: message.title || '',
        content: message.content,
        type: message.type || 'text',
        timestamp: new Date().toISOString(),
      };
    }

    let body = this.bodyTemplate;
    const variables = {
      title: message.title || '',
      content: message.content,
      type: message.type || 'text',
      timestamp: new Date().toISOString(),
    };

    // 替换模板变量
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      body = body.replace(regex, value);
    });

    // 尝试解析为 JSON，如果失败则返回字符串
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  /**
   * 渲染 Headers（支持模板变量）
   */
  renderHeaders(message) {
    const rendered = {};
    const variables = {
      title: message.title || '',
      content: message.content,
      type: message.type || 'text',
      timestamp: new Date().toISOString(),
    };

    Object.entries(this.headers).forEach(([key, value]) => {
      let renderedValue = value;
      Object.entries(variables).forEach(([varKey, varValue]) => {
        const regex = new RegExp(`{{\\s*${varKey}\\s*}}`, 'g');
        renderedValue = renderedValue.replace(regex, varValue);
      });
      rendered[key] = renderedValue;
    });

    return rendered;
  }

  async send(message) {
    try {
      const body = this.renderBody(message);
      const headers = {
        'Content-Type': 'application/json',
        ...this.renderHeaders(message),
      };

      const config = {
        method: this.method,
        url: this.url,
        headers,
        timeout: 30000,
      };

      // 根据方法添加数据
      if (this.method === 'GET' || this.method === 'HEAD') {
        config.params = body;
      } else {
        config.data = body;
      }

      logger.info(`[Webhook] Sending ${this.method} request to ${this.url}`);

      const response = await axios(config);

      return {
        success: true,
        messageId: response.headers['x-request-id'] || `webhook_${Date.now()}`,
        response: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      logger.error('[Webhook] Send failed:', error.message);
      throw new Error(`Webhook 发送失败: ${error.response?.data?.message || error.message}`);
    }
  }

  validate(config) {
    if (!config.url) {
      return { valid: false, message: 'Webhook URL 不能为空' };
    }

    try {
      new URL(config.url);
    } catch {
      return { valid: false, message: '无效的 URL 格式' };
    }

    const validMethods = ['GET', 'POST', 'PUT', 'PATCH'];
    if (config.method && !validMethods.includes(config.method.toUpperCase())) {
      return { valid: false, message: `不支持的 HTTP 方法: ${config.method}` };
    }

    // 验证 Headers 是否为对象
    if (config.headers && typeof config.headers !== 'object') {
      return { valid: false, message: 'Headers 必须是 JSON 对象格式' };
    }

    return { valid: true, message: '' };
  }

  async test() {
    try {
      const testMessage = {
        title: '测试消息',
        content: '这是一条来自魔法推送的 Webhook 测试消息',
        type: 'text',
      };

      const result = await this.send(testMessage);

      return {
        success: result.success,
        message: 'Webhook 测试成功',
        response: result.response,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  static getName() {
    return 'Webhook';
  }

  static getDescription() {
    return '通用 Webhook，支持自定义 URL、Headers 和 Body 模板';
  }

  static getConfigFields() {
    return [
      {
        name: 'url',
        label: 'Webhook URL',
        type: 'text',
        required: true,
        placeholder: 'https://example.com/webhook',
        description: '接收推送的 Webhook 地址',
      },
      {
        name: 'method',
        label: 'HTTP 方法',
        type: 'select',
        required: true,
        options: [
          { value: 'POST', label: 'POST' },
          { value: 'GET', label: 'GET' },
          { value: 'PUT', label: 'PUT' },
          { value: 'PATCH', label: 'PATCH' },
        ],
        default: 'POST',
        description: '请求方法',
      },
      {
        name: 'headers',
        label: '自定义 Headers',
        type: 'json',
        required: false,
        placeholder: '{"Authorization": "Bearer token123", "X-Custom": "value"}',
        description: '自定义 HTTP 请求头（JSON 格式），支持模板变量',
      },
      {
        name: 'bodyTemplate',
        label: 'Body 模板',
        type: 'textarea',
        required: false,
        placeholder: '{"title": "{{title}}", "content": "{{content}}", "time": "{{timestamp}}"}',
        description: '请求体模板，支持变量: {{title}}, {{content}}, {{type}}, {{timestamp}}。留空使用默认 JSON 格式',
      },
    ];
  }
}

module.exports = WebhookChannel;
