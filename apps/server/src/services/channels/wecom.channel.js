const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * 企业微信机器人适配器
 */
class WecomChannel extends BaseChannel {
  constructor(config, channelKey) {
    super(config, channelKey);
    const key = config.key.trim();
    if (key.startsWith('https://') || key.startsWith('http://')) {
      this.webhookUrl = key;
    } else {
      this.webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`;
    }
  }

  async send(message) {
    const { title, content, type = 'text', channelType, extraData } = message;

    // 有 channelType → 走特有消息分支
    if (channelType) {
      // extraData 已经在 push.service 中通过命名空间提取，直接使用
      return await this.sendChannelSpecific(channelType, extraData);
    }

    // 通用类型处理
    let payload;

    if (type === 'markdown') {
      payload = {
        msgtype: 'markdown',
        markdown: {
          content: title ? `# ${title}\n${content}` : content,
        },
      };
    } else if (type === 'html') {
      // 企业微信群机器人不支持 HTML，降级为纯文本
      const plainText = BaseChannel.stripHtmlTags(content);
      const text = title ? `${title}\n\n${plainText}` : plainText;
      payload = {
        msgtype: 'text',
        text: {
          content: text,
        },
      };
    } else {
      // text 类型
      const text = title ? `${title}\n\n${content}` : content;
      payload = {
        msgtype: 'text',
        text: {
          content: text,
        },
      };
    }

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信发送失败: ${response.data.errmsg}`);
    }

    return {
      success: true,
      messageId: response.data.msgid,
    };
  }

  /**
   * 处理渠道特有类型的消息
   * @param {string} channelType - 渠道特有类型标识
   * @param {Object} extraData - 特有类型的额外数据
   * @returns {Promise<Object>} - 发送结果
   */
  async sendChannelSpecific(channelType, extraData) {
    switch (channelType) {
      case 'news':
        return await this.sendNews(extraData);
      case 'image':
        return await this.sendImage(extraData);
      case 'file':
        return await this.sendFile(extraData);
      case 'voice':
        return await this.sendVoice(extraData);
      case 'markdown_v2':
        return await this.sendMarkdownV2(extraData);
      case 'template_card':
        return await this.sendTemplateCard(extraData);
      default:
        throw new Error(`不支持的渠道特有类型: ${channelType}`);
    }
  }

  /**
   * 发送图文消息
   * @param {Object} data - 图文消息数据，包含 articles 数组
   */
  async sendNews(data) {
    if (!data || !data.articles || !Array.isArray(data.articles) || data.articles.length === 0) {
      throw new Error('图文消息必须包含 articles 数组');
    }

    const payload = {
      msgtype: 'news',
      news: {
        articles: data.articles.map(article => ({
          title: article.title || '',
          description: article.description || '',
          url: article.url || '',
          picurl: article.picurl || '',
        })),
      },
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信图文消息发送失败: ${response.data.errmsg}`);
    }

    return {
      success: true,
      messageId: response.data.msgid,
      type: 'news',
    };
  }

  /**
   * 发送图片消息
   * 群机器人支持在 JSON payload 中内联 base64（无需预上传）
   * 支持三种方式: base64(内联) / url(下载后转base64内联)
   */
  async sendImage(data) {
    if (!data) throw new Error('图片消息必须提供数据');

    let finalBase64;
    if (data.base64) {
      finalBase64 = data.base64;
    } else if (data.url) {
      finalBase64 = await this._downloadToBase64(data.url);
    } else {
      throw new Error('图片消息必须提供 base64 或 url');
    }

    const payload = {
      msgtype: 'image',
      image: {
        base64: finalBase64,
        md5: data.md5 || '',
      },
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信图片消息发送失败: ${response.data.errmsg}`);
    }

    return { success: true, messageId: response.data.msgid, type: 'image' };
  }

  /**
   * 发送文件消息
   * 群机器人文件只支持 media_id 模式（必须先上传获取 media_id）
   * 支持三种方式: media_id(直接用) / base64(上传) / url(下载后上传)
   */
  async sendFile(data) {
    if (!data) throw new Error('文件消息必须提供数据');

    let mediaId;

    if (data.media_id) {
      mediaId = data.media_id;
    } else if (data.base64 || data.url) {
      mediaId = await this._uploadMedia('file', { base64: data.base64, url: data.url });
    } else {
      throw new Error('文件消息必须提供 media_id、base64 或 url');
    }

    const payload = {
      msgtype: 'file',
      file: { media_id: mediaId },
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信文件消息发送失败: ${response.data.errmsg}`);
    }

    return { success: true, messageId: response.data.msgid, type: 'file' };
  }

  /**
   * 发送语音消息
   * 群机器人语音只支持 media_id 模式（必须先上传获取 media_id）
   * 支持三种方式: media_id(直接用) / base64(上传) / url(下载后上传)
   */
  async sendVoice(data) {
    if (!data) throw new Error('语音消息必须包含数据');

    let mediaId;

    if (data.media_id) {
      mediaId = data.media_id;
    } else if (data.base64 || data.url) {
      mediaId = await this._uploadMedia('voice', { base64: data.base64, url: data.url });
    } else {
      throw new Error('语音消息必须提供 media_id、base64 或 url');
    }

    const payload = {
      msgtype: 'voice',
      voice: { media_id: mediaId },
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信语音消息发送失败: ${response.data.errmsg}`);
    }

    return { success: true, messageId: response.data.msgid, type: 'voice' };
  }

  /**
   * 发送 Markdown 增强版消息（markdown_v2）
   * 支持表格、斜体、列表、独立代码块等更丰富的语法
   * 需要客户端版本 ≥ 4.1.36 才能正常渲染
   * @param {Object} data - Markdown_v2 消息数据
   */
  async sendMarkdownV2(data) {
    const content = data?.content || '';

    if (!content) {
      throw new Error('Markdown增强版消息必须包含 content 内容');
    }

    const payload = {
      msgtype: 'markdown_v2',
      markdown_v2: {
        content: content,
      },
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信Markdown增强版消息发送失败: ${response.data.errmsg}`);
    }

    return {
      success: true,
      messageId: response.data.msgid,
      type: 'markdown_v2',
    };
  }

  /**
   * 发送模板卡片消息
   * @param {Object} data - 模板卡片数据
   */
  async sendTemplateCard(data) {
    if (!data || !data.card_type) {
      throw new Error('模板卡片必须指定 card_type');
    }

    const validTypes = ['text_notice', 'news_notice', 'button_interaction'];
    if (!validTypes.includes(data.card_type)) {
      throw new Error(`不支持的卡片类型: ${data.card_type}，支持的类型: ${validTypes.join(', ')}`);
    }

    const payload = {
      msgtype: 'template_card',
      template_card: {
        card_type: data.card_type,
        source: data.source || {},
        main_title: data.main_title || {},
        sub_title_text: data.sub_title_text || '',
        horizontal_content_list: data.horizontal_content_list || [],
        card_action: data.card_action || {},
      },
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信模板卡片发送失败: ${response.data.errmsg}`);
    }

    return {
      success: true,
      messageId: response.data.msgid,
      type: 'template_card',
    };
  }

  /**
   * 上传临时素材（文件/语音等），返回 media_id
   * 支持两种输入方式：
   *   1. base64 — Base64 编码字符串 → Buffer → 上传
   *   2. url — 公网可访问的资源 URL → axios 下载 → Buffer → 上传
   */
  async _uploadMedia(type, { base64, url: fileUrl } = {}) {
    let fileBuffer;

    if (base64) {
      fileBuffer = Buffer.from(base64, 'base64');
    } else if (fileUrl) {
      logger.info(`企业微信机器人正在下载资源: ${fileUrl}`);
      const res = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
      fileBuffer = Buffer.from(res.data);
      logger.info(`企业微信机器人资源下载完成: ${fileBuffer.length} bytes`);
    } else {
      throw new Error('上传媒体文件失败: 必须提供 base64 或 url');
    }

    // 从 webhookUrl 提取 key
    const url = new URL(this.webhookUrl);
    const key = url.searchParams.get('key');

    const uploadUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=${key}&type=${type}`;

    const response = await axios.post(uploadUrl, fileBuffer, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 30000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信${type === 'voice' ? '语音' : '文件'}上传失败: ${response.data.errmsg}`);
    }

    return response.data.media_id;
  }

  /**
   * 下载远程资源并转为 Base64 字符串（用于 image/file 内联发送）
   */
  async _downloadToBase64(fileUrl) {
    logger.info(`企业微信机器人正在下载资源: ${fileUrl}`);
    const res = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const buffer = Buffer.from(res.data);
    logger.info(`企业微信机器人资源下载完成: ${buffer.length} bytes`);
    return buffer.toString('base64');
  }

  validate(config) {
    if (!config.key || config.key.trim() === '') {
      return { valid: false, message: '机器人Key不能为空' };
    }
    const key = config.key.trim();
    if (key.startsWith('https://') || key.startsWith('http://')) {
      try {
        const url = new URL(key);
        if (!url.searchParams.get('key')) {
          return { valid: false, message: 'URL中未找到key参数' };
        }
      } catch {
        return { valid: false, message: '无效的URL格式' };
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
    return '企业微信群机器人';
  }

  static getDescription() {
    return '支持8种消息类型';
  }

  static getSupportedTypes() {
    return ['text', 'markdown', 'html'];
  }

  static getChannelSpecificTypes() {
    return [
      {
        value: 'news',
        label: '图文消息',
        icon: '📰',
        description: '支持多条图文链接，适用于资讯推送、公告通知等场景',
        fields: [
          {
            name: 'articles',
            label: '文章列表',
            type: 'array',
            required: true,
            itemFields: [
              { name: 'title', label: '标题', type: 'text', required: true, maxLength: 128 },
              { name: 'description', label: '描述', type: 'textarea', required: false, maxLength: 512 },
              { name: 'url', label: '链接地址', type: 'url', required: false },
              { name: 'picurl', label: '封面图URL', type: 'url', required: false },
            ],
          },
        ],
        example: {
          channelType: 'news',
          extraData: {
            wecom: {
              articles: [
                {
                  title: '中秋节礼品到',
                  description: '今年中秋公司为大家准备了精美礼品',
                  url: 'https://example.com/gift',
                  picurl: 'https://example.com/mid-autumn.jpg'
                }
              ]
            }
          }
        }
      },
      {
        value: 'image',
        label: '图片消息',
        icon: '🖼️',
        description: '发送图片，支持 Base64 编码或 URL 自动下载（JPG/PNG格式，内联发送）',
        fields: [
          { name: 'base64', label: '图片Base64编码', type: 'textarea', required: false, description: '图片的Base64编码字符串（不含data:image前缀），与url二选一' },
          { name: 'url', label: '图片URL', type: 'url', required: false, description: '公网可访问的图片URL，后端自动下载后转Base64内联发送（与base64二选一）' },
          { name: 'md5', label: 'MD5签名', type: 'text', required: false, description: '图片内容的MD5值（可选，用于校验）' },
        ],
        example: {
          channelType: 'image',
          extraData: {
            wecom: {
              url: 'https://example.com/screenshot.jpg'
              // 或者用 base64: { base64: 'iVBORw0KGgoAAAANS...', md5: 'a1b2c3d4...' }
            }
          }
        }
      },
      {
        value: 'file',
        label: '文件消息',
        icon: '📎',
        description: '发送文件，支持 media_id / Base64 / URL 上传（多种格式，≤20MB）',
        fields: [
          { name: 'media_id', label: '媒体ID', type: 'text', required: false, description: '已上传的媒体ID（优先使用，跳过重新上传）' },
          { name: 'base64', label: '文件Base64编码', type: 'textarea', required: false, description: '文件的Base64编码字符串（将自动上传获取media_id，与url二选一）' },
          { name: 'url', label: '文件URL', type: 'url', required: false, description: '公网可访问的文件URL，后端自动下载后上传获取media_id（与base64二选一）' },
        ],
        example: {
          channelType: 'file',
          extraData: {
            wecom: {
              url: 'https://example.com/report.pdf'
              // 或者用 base64: { base64: 'JVBERi0xLjQK...' }
              // 或者用 media_id: { media_id: '@lALdD...' }
            }
          }
        }
      },
      {
        value: 'voice',
        label: '语音消息',
        icon: '🎤',
        description: '发送语音消息（AMR格式，≤2M，时长≤60秒），需先上传获取media_id',
        fields: [
          { name: 'media_id', label: '媒体ID', type: 'text', required: false, description: '已上传的媒体ID（优先使用，跳过重新上传）' },
          { name: 'base64', label: '语音Base64编码', type: 'textarea', required: false, description: '语音的Base64编码字符串（AMR格式，与url二选一）' },
          { name: 'url', label: '语音URL', type: 'url', required: false, description: '公网可访问的语音文件URL，后端自动下载后上传（与base64二选一）' },
        ],
        example: {
          channelType: 'voice',
          extraData: {
            wecom: {
              url: 'https://example.com/voice.amr'
              // 或者用 base64: { base64: 'IyAgICAg...' }
              // 或者用 media_id: { media_id: '@lALdD...' }
            }
          }
        }
      },
      {
        value: 'markdown_v2',
        label: 'Markdown增强版',
        icon: '✍️',
        description: '增强版Markdown格式，支持表格、斜体、列表、代码块等丰富语法（需客户端≥4.1.36）',
        fields: [
          { name: 'content', label: 'Markdown内容', type: 'textarea', required: true, description: 'Markdown_v2格式内容（最长4096字节），不支持字体颜色和@群成员语法' },
        ],
        example: {
          channelType: 'markdown_v2',
          extraData: {
            wecom: {
              content: '| 项目 | 状态 | 进度 |\n|------|------|------|\n| 任务A | 进行中 | 80% |\n| 任务B | 已完成 | 100% |'
            }
          }
        }
      },
      {
        value: 'template_card',
        label: '模板卡片',
        icon: '🃏',
        description: '交互式卡片消息，支持文本通知、图文通知和按钮互动三种样式',
        fields: [
          {
            name: 'card_type',
            label: '卡片类型',
            type: 'select',
            required: true,
            options: [
              { value: 'text_notice', label: '文本通知' },
              { value: 'news_notice', label: '图文通知' },
              { value: 'button_interaction', label: '按钮互动' },
            ],
          },
          { name: 'source', label: '来源信息', type: 'object', required: false, description: '卡片的来源信息对象' },
          { name: 'main_title', label: '主标题', type: 'object', required: false, description: '{ title: "标题内容" }' },
          { name: 'sub_title_text', label: '副标题', type: 'text', required: false, maxLength: 256 },
          { name: 'horizontal_content_list', label: '横列内容列表', type: 'array', required: false },
          { name: 'card_action', label: '操作按钮', type: 'object', required: false, description: '{ url: "点击跳转URL", type: 1 }' },
        ],
        example: {
          channelType: 'template_card',
          extraData: {
            wecom: {
              card_type: 'text_notice',
              source: {
                desc_text: '来自魔法推送'
              },
              main_title: {
                title: '系统升级通知'
              },
              sub_title_text: '系统将于今晚22:00-23:00进行升级维护',
              horizontal_content_list: [
                { keyname: '时间', value: '2024-01-15 22:00-23:00' },
                { keyname: '影响范围', value: '所有用户' },
              ],
              card_action: {
                url: 'https://example.com/notice',
                type: 1
              }
            }
          }
        }
      },
    ];
  }

  static getConfigFields() {
    return [
      {
        name: 'key',
        label: '机器人Key',
        type: 'text',
        required: true,
        placeholder: '请输入企业微信机器人Key或完整Webhook地址',
        description: '在企业微信群中添加机器人后获取的Key，支持直接粘贴完整Webhook地址',
      },
      {
        name: '_docLinks',
        label: '参考链接',
        type: 'links',
        required: false,
        links: [
          {
            label: '官方文档',
            url: 'https://developer.work.weixin.qq.com/document/path/99110',
          },
        ],
      },
    ];
  }
}

module.exports = WecomChannel;
