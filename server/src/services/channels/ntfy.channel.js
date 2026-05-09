const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * ntfy 渠道适配器
 *
 * ntfy 是一个轻量级的开源推送通知服务
 * 官网: https://ntfy.sh/
 * API 文档: https://docs.ntfy.sh/publish/
 *
 * 发送消息接口: POST {serverUrl}/{topic}
 * 鉴权方式: Bearer Token / Basic Auth（用户名密码）/ 匿名
 */
class NtfyChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.serverUrl - ntfy 服务端地址
   * @param {string} config.topic - Topic 名称
   * @param {string} [config.username] - Basic Auth 用户名
   * @param {string} [config.password] - Basic Auth 密码
   * @param {string} [config.accessToken] - Access Token（Bearer Auth）
   * @param {number|string} [config.priority] - 优先级 1-5，默认 3
   * @param {string} [config.tags] - 标签，逗号分隔
   * @param {Array|Object} [config.actions] - 操作按钮数组或JSON字符串
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = (config.serverUrl && config.serverUrl.trim()) ? config.serverUrl.replace(/\/+$/, '') : 'https://ntfy.sh';
    this.topic = config.topic;
    // 认证信息：Basic Auth 优先级高于 Access Token
    this.username = config.username || '';
    this.password = config.password || '';
    this.accessToken = config.accessToken || '';
    // 解析优先级：支持数字(1-5) 和文本(min/low/default/high/max)
    this.priority = this._parsePriority(config.priority);
    // 标签
    this.tags = config.tags || '';
    // 操作按钮：支持 JSON 数组或 JSON 字符串解析
    this._actions = this._parseActions(config.actions);
    this.channelId = channelId;
  }

  /**
   * 解析操作按钮
   * 支持传入 JSON 数组或 JSON 字符串，最多 3 个动作
   */
  _parseActions(actions) {
    if (!actions) return [];
    let parsed;
    if (typeof actions === 'string') {
      try {
        parsed = JSON.parse(actions);
      } catch {
        return [];
      }
    } else if (Array.isArray(actions)) {
      parsed = actions;
    } else {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    // 限制最多 3 个
    return parsed.slice(0, 3);
  }

  _parsePriority(value) {
    if (!value && value !== 0) return 3; // default
    const map = {
      'min': 1, '1': 1,
      'low': 2, '2': 2,
      'default': 3, '3': 3,
      'high': 4, '4': 4,
      'max': 5, 'urgent': 5, '5': 5,
    };
    const normalized = String(value).trim().toLowerCase();
    if (map[normalized] !== undefined) return map[normalized];
    const num = parseInt(value);
    return (num >= 1 && num <= 5) ? num : 3;
  }

  async send(message) {
    const { title, content, type = 'text', url } = message;
    let text = content;

    // HTML → 纯文本
    if (type === 'html') {
      text = this._stripHtml(text);
    }

    // 构建请求 Headers
    const headers = {
      'Content-Type': type === 'markdown' ? 'text/markdown' : 'text/plain',
    };

    // 鉴权（优先使用 Basic Auth，其次 Access Token）
    if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // 标题
    if (title) {
      headers['Title'] = title;
    }

    // 优先级（默认值不传）
    if (this.priority !== 3) {
      headers['Priority'] = this.priority;
    }

    // Markdown 模式（当 type=markdown 时启用）
    if (type === 'markdown') {
      headers['Markdown'] = 'yes';
    }

    // 点击跳转（利用 MagicPush 消息的 url 字段）
    if (url) {
      headers['Click'] = url;
    }

    // 标签
    if (this.tags) {
      headers['Tags'] = this.tags;
    }

    // 操作按钮（X-Actions header 格式）
    if (this._actions.length > 0) {
      const actionStrings = this._actions.map(a => {
        const parts = [`action=${a.action}`, `label=${a.label}`];
        if (a.url) parts.push(a.url);
        if (a.clear) parts.push('clear=true');
        if (a.body) parts.push(`body=${a.body}`);
        if (a.intent) parts.push(`intent=${a.intent}`);
        if (a.extras) {
          Object.entries(a.extras).forEach(([k, v]) => parts.push(`extras.${k}=${v}`));
        }
        return parts.join(', ');
      });
      headers['Actions'] = actionStrings.join('; ');
    }

    logger.info(`ntfy 发送消息: server=${this.serverUrl}, topic=${this.topic}, priority=${this.priority}`);

    const response = await axios.post(
      `${this.serverUrl}/${this.topic}`,
      text,
      {
        headers,
        timeout: 15000,
      }
    );

    return response.data;
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
    if (config.serverUrl && config.serverUrl.trim() !== '') {
      try {
        new URL(config.serverUrl);
      } catch {
        return { valid: false, message: '服务器地址格式不正确' };
      }
    }
    if (!config.topic || config.topic.trim() === '') {
      return { valid: false, message: 'Topic 不能为空' };
    }
    // Topic 名称合法性检查：只允许字母、数字、下划线、连字符
    if (!/^[a-zA-Z0-9_\-]+$/.test(config.topic.trim())) {
      return { valid: false, message: 'Topic 只能包含字母、数字、下划线和连字符' };
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送(MagicPush)的测试消息 🎉',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'ntfy';
  }

  static getDescription() {
    return '轻量级开源推送通知服务';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: '服务器地址',
        type: 'text',
        required: false,
        placeholder: '默认 https://ntfy.sh（官方公共云）',
        description: 'ntfy 服务端地址，留空则使用官方公共云 ntffy.sh（免费）',
      },
      {
        name: 'topic',
        label: 'Topic 名称',
        type: 'text',
        required: true,
        placeholder: '如 myapp_alerts_prod',
        description: 'Topic 相当于频道名，也是访问凭证（选一个不易被猜到的名字）。只允许字母、数字、下划线、连字符',
      },
      {
        name: 'username',
        label: '用户名（Basic Auth）',
        type: 'text',
        required: false,
        placeholder: '与 Access Token 二选一',
        description: 'ntfy 用户名。与 Access Token 二选一，两者都有时优先生效。公共云不需要',
      },
      {
        name: 'password',
        label: '密码（Basic Auth）',
        type: 'password',
        required: false,
        placeholder: '与用户名配对使用',
        description: 'ntfy 密码。与用户名配对使用，用于 Basic Auth 认证',
      },
      {
        name: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: false,
        placeholder: '自托管且开启认证时填写',
        description: 'Access Token 用于身份验证（Bearer Auth）。使用公共云 ntffy.sh 时通常不需要。与用户名密码二选一',
      },
      {
        name: 'priority',
        label: '消息优先级',
        type: 'select',
        required: false,
        placeholder: '默认 default(3)',
        options: [
          { label: '1 - Min（静默）', value: '1' },
          { label: '2 - Low（低）', value: '2' },
          { label: '3 - Default（正常，推荐）', value: '3' },
          { label: '4 - High（高）', value: '4' },
          { label: '5 - Max/urgent（紧急）', value: '5' },
        ],
        description: '控制手机通知的振动和声音方式。日常消息建议用 Default',
      },
      {
        name: 'tags',
        label: '标签',
        type: 'text',
        required: false,
        placeholder: '如 warning,backup,ssh-login',
        description: '通知标签，逗号分隔（如 warning,backup）。支持 Emoji 短码自动转换',
      },
      {
        name: 'actions',
        label: '操作按钮（最多 3 个）',
        type: 'json',
        required: false,
        placeholder: '[{"action":"view","label":"打开面板","url":"https://..."}]',
        description: 'JSON 数组，每个元素含 action(view/http/broadcast/copy)、label、url 等。留空则不显示操作按钮',
      },
    ];
  }
}

module.exports = NtfyChannel;
