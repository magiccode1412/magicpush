const axios = require('axios');
const FormData = require('form-data');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * Telegram Bot适配器
 *
 * 支持的消息类型：
 * - 通用类型: text, markdown, html
 * - 特有类型: photo(图片), document(文件), location(位置)
 *
 * API 文档: https://core.telegram.org/bots/api
 */
class TelegramChannel extends BaseChannel {
  constructor(config, channelKey) {
    super(config, channelKey);
    this.apiUrl = `https://api.telegram.org/bot${config.botToken}`;
    this.chatId = config.chatId;
    this.proxyUrl = config.proxyUrl;
  }

  /**
   * 构建带代理的 axios 配置
   */
  _buildConfig(timeout = 10000) {
    const config = {
      headers: {},
      timeout,
    };

    const proxyAgent = this.createProxyAgent(this.proxyUrl);
    if (proxyAgent) {
      config.httpsAgent = proxyAgent;
    }
    return config;
  }

  async send(message) {
    const { title, content, type = 'text', channelType, extraData } = message;

    // 有 channelType → 走特有消息分支
    if (channelType) {
      // extraData 已经在 push.service 中通过命名空间提取，直接使用
      return await this.sendChannelSpecific(channelType, extraData);
    }

    // 通用类型处理（保持原有逻辑不变）
    let text;
    if (type === 'markdown' || type === 'html') {
      text = title ? `*${title}*\n\n${content}` : content;
    } else {
      text = title ? `<b>${title}</b>\n\n${content}` : content;
    }

    const parseMode = type === 'markdown' ? 'Markdown' : 'HTML';

    const payload = {
      chat_id: this.chatId,
      text: text,
      parse_mode: parseMode,
    };

    const axiosConfig = this._buildConfig();

    const response = await axios.post(`${this.apiUrl}/sendMessage`, payload, axiosConfig);

    if (!response.data.ok) {
      throw new Error(`Telegram发送失败: ${response.data.description}`);
    }

    return {
      success: true,
      messageId: response.data.result.message_id,
    };
  }

  /**
   * 处理渠道特有类型的消息
   */
  async sendChannelSpecific(channelType, extraData) {
    switch (channelType) {
      case 'photo':
        return await this.sendPhoto(extraData);
      case 'document':
        return await this.sendDocument(extraData);
      case 'location':
        return await this.sendLocation(extraData);
      default:
        throw new Error(`不支持的渠道特有类型: ${channelType}`);
    }
  }

  /**
   * 发送图片消息
   * API: /sendPhoto
   * 支持 URL 或 Base64 编码的图片
   * 文档: https://core.telegram.org/bots/api#sendphoto
   */
  async sendPhoto(data) {
    if (!data) {
      throw new Error('图片数据不能为空');
    }

    let axiosConfig;
    let response;

    if (data.url) {
      // 通过 URL 发送
      const payload = {
        chat_id: this.chatId,
        photo: data.url,
        caption: data.caption || '',
      };
      if (data.parse_mode) {
        payload.parse_mode = data.parse_mode;
      }
      axiosConfig = this._buildConfig(15000);
      response = await axios.post(`${this.apiUrl}/sendPhoto`, payload, axiosConfig);
    } else if (data.base64) {
      // 通过 multipart/form-data 发送 base64 图片
      const buffer = Buffer.from(data.base64, 'base64');
      const formData = new FormData();
      formData.append('photo', buffer, { filename: data.filename || 'photo.jpg' });
      formData.append('chat_id', this.chatId);
      if (data.caption) {
        formData.append('caption', data.caption);
      }
      if (data.parse_mode) {
        formData.append('parse_mode', data.parse_mode);
      }

      axiosConfig = this._buildConfig(20000);
      axiosConfig.headers = {
        ...formData.getHeaders(),
        ...axiosConfig.headers,
      };
      response = await axios.post(`${this.apiUrl}/sendPhoto`, formData, axiosConfig);
    } else {
      throw new Error('图片消息必须包含 url 或 base64 数据');
    }

    if (!response.data.ok) {
      throw new Error(`Telegram图片发送失败: ${response.data.description}`);
    }

    return {
      success: true,
      messageId: response.data.result.message_id,
      type: 'photo',
    };
  }

  /**
   * 发送文件消息
   * API: /sendDocument
   * 支持通过 URL 或 Base64 编码发送
   * 文档: https://core.telegram.org/bots/api#senddocument
   */
  async sendDocument(data) {
    if (!data) {
      throw new Error('文件数据不能为空');
    }

    let axiosConfig;
    let response;

    if (data.url) {
      // 通过 URL 发送
      const payload = {
        chat_id: this.chatId,
        document: data.url,
        caption: data.caption || '',
      };
      if (data.parse_mode) {
        payload.parse_mode = data.parse_mode;
      }
      axiosConfig = this._buildConfig(20000);
      response = await axios.post(`${this.apiUrl}/sendDocument`, payload, axiosConfig);
    } else if (data.base64) {
      // 通过 multipart/form-data 发送 base64 文件
      const buffer = Buffer.from(data.base64, 'base64');
      const formData = new FormData();
      formData.append('document', buffer, { filename: data.filename || 'file.bin' });
      formData.append('chat_id', this.chatId);
      if (data.caption) {
        formData.append('caption', data.caption);
      }
      if (data.parse_mode) {
        formData.append('parse_mode', data.parse_mode);
      }

      axiosConfig = this._buildConfig(30000);
      axiosConfig.headers = {
        ...formData.getHeaders(),
        ...axiosConfig.headers,
      };
      response = await axios.post(`${this.apiUrl}/sendDocument`, formData, axiosConfig);
    } else {
      throw new Error('文件消息必须包含 url 或 base64 数据');
    }

    if (!response.data.ok) {
      throw new Error(`Telegram文件发送失败: ${response.data.description}`);
    }

    return {
      success: true,
      messageId: response.data.result.message_id,
      type: 'document',
    };
  }

  /**
   * 发送位置消息
   * API: /sendLocation
   * 文档: https://core.telegram.org/bots/api#sendlocation
   */
  async sendLocation(data) {
    if (!data) {
      throw new Error('位置数据不能为空');
    }
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new Error('位置消息必须包含 latitude（纬度）和 longitude（经度）');
    }

    const payload = {
      chat_id: this.chatId,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
    };
    if (data.title) {
      payload.title = String(data.title).slice(0, 256); // Telegram 限制最大256字符
    }
    if (data.address) {
      payload.address = String(data.address);
    }

    logger.info(`Telegram发送位置: lat=${payload.latitude}, lon=${payload.longitude}`);
    const axiosConfig = this._buildConfig();
    const response = await axios.post(`${this.apiUrl}/sendLocation`, payload, axiosConfig);

    if (!response.data.ok) {
      throw new Error(`Telegram位置发送失败: ${response.data.description}`);
    }

    return {
      success: true,
      messageId: response.data.result.message_id,
      type: 'location',
    };
  }

  validate(config) {
    if (!config.botToken || config.botToken.trim() === '') {
      return { valid: false, message: 'Bot Token不能为空' };
    }
    if (!config.chatId || config.chatId.trim() === '') {
      return { valid: false, message: 'Chat ID不能为空' };
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
    return 'Telegram';
  }

  static getDescription() {
    return 'Telegram Bot，支持文本、Markdown、HTML、图片、文件和位置消息';
  }

  static getSupportedTypes() {
    return ['text', 'markdown', 'html'];
  }

  static getChannelSpecificTypes() {
    return [
      {
        value: 'photo',
        label: '图片消息',
        icon: '🖼️',
        description: '发送图片，支持URL或Base64编码',
        fields: [
          { name: 'url', label: '图片URL', type: 'url', required: false, description: '图片的直接访问URL（与base64二选一）' },
          { name: 'base64', label: 'Base64编码', type: 'textarea', required: false, description: '图片的Base64编码字符串（与url二选一）' },
          { name: 'filename', label: '文件名', type: 'text', required: false, defaultValue: 'photo.jpg' },
          { name: 'caption', label: '说明文字', type: 'text', required: false, description: '图片下方的说明文字' },
          { name: 'parse_mode', label: '说明文字格式', type: 'select', required: false, options: [
            { value: '', label: '普通文本' },
            { value: 'Markdown', label: 'Markdown' },
            { value: 'HTML', label: 'HTML' },
          ]},
        ],
        example: {
          channelType: 'photo',
          extraData: {
            telegram: {
              url: 'https://picsum.photos/600/400',
              caption: '今日天气实况'
            }
          }
        }
      },
      {
        value: 'document',
        label: '文件消息',
        icon: '📎',
        description: '发送文件，支持URL或Base64编码',
        fields: [
          { name: 'url', label: '文件URL', type: 'url', required: false, description: '文件的直接访问URL（与base64二选一）' },
          { name: 'base64', label: 'Base64编码', type: 'textarea', required: false, description: '文件的Base64编码字符串（与url二选一）' },
          { name: 'filename', label: '文件名', type: 'text', required: false, defaultValue: 'file.pdf' },
          { name: 'caption', label: '说明文字', type: 'text', required: false, description: '文件下方的说明文字' },
        ],
        example: {
          channelType: 'document',
          extraData: {
            telegram: {
              url: 'https://example.com/report.pdf',
              caption: '2024年第一季度报告'
            }
          }
        }
      },
      {
        value: 'location',
        label: '位置消息',
        icon: '📍',
        description: '发送地理位置信息',
        fields: [
          { name: 'latitude', label: '纬度', type: 'number', required: true, description: '例如：39.9042（北京纬度）' },
          { name: 'longitude', label: '经度', type: 'number', required: true, description: '例如：116.4074（北京经度）' },
          { name: 'title', label: '地点名称', type: 'text', required: false, maxLength: 256, description: '显示在位置上方的标题' },
          { name: 'address', label: '详细地址', type: 'text', required: false, description: '详细地址信息' },
        ],
        example: {
          channelType: 'location',
          extraData: {
            telegram: {
              latitude: 39.9042,
              longitude: 116.4074,
              title: '天安门广场',
              address: '北京市东城区长安街'
            }
          }
        }
      },
    ];
  }

  static getConfigFields() {
    return [
      {
        name: 'botToken',
        label: 'Bot Token',
        type: 'text',
        required: true,
        placeholder: '请输入Telegram Bot Token',
        description: '从@BotFather获取的Bot Token',
      },
      {
        name: 'chatId',
        label: 'Chat ID',
        type: 'text',
        required: true,
        placeholder: '请输入Chat ID',
        description: '目标聊天ID（用户ID或群组ID）',
      },
      {
        name: 'proxyUrl',
        label: '代理地址',
        type: 'text',
        required: false,
        placeholder: '如 http://127.0.0.1:7890',
        description: '可选，用于访问Telegram API的代理地址',
      },
    ];
  }
}

module.exports = TelegramChannel;
