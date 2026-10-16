const BaseChannel = require('./base.channel');
const QqbotClient = require('../qqbot/qqbot-client');

/**
 * QQ 官方机器人渠道适配器
 *
 * 支持两种推送模式：
 * - 群聊消息 (group)：发送到指定 QQ 群（需 @机器人）
 * - C2C 单聊消息 (c2c)：发送到指定用户的消息列表
 *
 * 鉴权方式：Authorization: QQBot ${accessToken}（Access Token 自动管理）
 */
class QqbotChannel extends BaseChannel {
  // QQ 消息长度限制
  static MAX_MESSAGE_LENGTH = 5000;

  // file_info 缓存 Map: key → { fileInfo, expireAt }
  _mediaCache = new Map();

  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.appId - 机器人 AppID
   * @param {string} config.token - 应用密钥 AppSecret（用于自动获取 Access Token）
   * @param {string} config.msgType - 消息类型: 'group'(群聊) | 'c2c'(单聊)
   * @param {string} config.targetId - 目标 ID（根据 msgType 不同含义不同）
   * @param {string} [config.sourceGuildId] - 来源频道ID（私信模式可选）
   * @param {string} [config.proxyUrl] - 代理地址
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId, channelKey) {
    super(config, channelKey);
    this.appId = config.appId;
    this.clientSecret = config.token; // 字段名保持为 token 以兼容已有数据，但语义是 clientSecret
    this.msgType = config.msgType || 'group';
    this.targetId = config.targetId;
    this.proxyUrl = config.proxyUrl;
    this.channelId = channelId;

    // 群/C2C 消息序号计数器，用于去重
    this._msgSeq = 0;
  }

  async send(message) {
    const { title, content, type = 'text', channelType, extraData } = message;

    // 有 channelType → 走特有消息分支
    if (channelType) {
      // extraData 已经在 push.service 中通过命名空间提取，直接使用
      return await this.sendChannelSpecific(channelType, extraData);
    }

    // 以下保持原有的 text/markdown 处理逻辑不变
    let text = title ? `${title}\n\n${content}` : content;

    // QQ 消息类型处理
    // 群聊和单聊都支持 markdown
    if (type === 'html') {
      text = BaseChannel.stripHtmlTags(text);
    }

    // 清理文本：移除前后空白、合并多余空行
    text = text.trim();
    text = text.replace(/\n{3,}/g, '\n\n');

    // 消息长度限制：QQ限制单条消息最大 5000 字符
    if (text.length > QqbotChannel.MAX_MESSAGE_LENGTH) {
      const originalLength = text.length;
      text = text.substring(0, QqbotChannel.MAX_MESSAGE_LENGTH);
      console.warn(`[QQBot] 消息已截断: ${originalLength} → ${text.length} 字符`);
    }

    // 空内容检查
    if (!text || text.length === 0) {
      throw new Error('消息内容不能为空');
    }

    console.log(`[QQBot] 准备发送消息: type=${type}, msgType=${this.msgType}, contentLength=${text.length}`);
    if (type === 'markdown') {
      // 打印前200个字符用于调试
      console.log(`[QQBot] Markdown内容预览: ${text.substring(0, 200)}...`);
    }

    // 计算当前场景支持的 msg_type
    // 群聊和单聊都支持文本(0)和 markdown(2)
    const qqMsgType = (this.msgType === 'group' || this.msgType === 'c2c')
      ? (type === 'markdown' ? 2 : 0)
      : undefined;

    const client = new QqbotClient({
      appId: this.appId,
      clientSecret: this.clientSecret,
      proxyUrl: this.proxyUrl,
    });

    try {
      switch (this.msgType) {
        case 'group':
          return await client.sendGroupMessage(this.targetId, {
            content: text,
            msgType: qqMsgType,
            msgSeq: ++this._msgSeq,
          });
        case 'c2c':
          return await client.sendC2CMessage(this.targetId, {
            content: text,
            msgType: qqMsgType,
            msgSeq: ++this._msgSeq,
          });
        default:
          throw new Error(`不支持的消息类型: ${this.msgType}，仅支持 group(群聊) 或 c2c(单聊)`);
      }
    } catch (error) {
      throw this._translateError(error);
    }
  }

  /**
   * 处理渠道特有类型的消息
   * @param {string} type - 特有类型标识（如 'media'）
   * @param {Object} extraData - 特有类型参数
   */
  async sendChannelSpecific(type, extraData) {
    switch (type) {
      case 'media':
        return await this.sendMedia(extraData);
      default:
        throw new Error(`不支持的特有消息类型: ${type}，QQ机器人支持的特有类型: media`);
    }
  }

  /**
   * 发送富媒体消息（图片/视频/语音/文件）
   * 流程：校验 → 查缓存或上传获取 file_info → 构造body → 发送
   *
   * @param {Object} data - 来自 extraData 的参数对象
   * @param {number} data.file_type - 媒体类型: 1(图片) | 2(视频) | 3(语音) | 4(文件)
   * @param {string} [data.url] - 媒体资源的公网可访问URL（推荐）
   * @param {string} [data.file_data] - 文件的Base64编码内容（无URL时使用）
   */
  async sendMedia(data) {
    // 1. 参数校验
    if (!data || typeof data !== 'object') {
      throw new Error('富媒体消息必须提供 extraData 对象');
    }

    const { file_type, url, file_data } = data;

    if (!file_type || ![1, 2, 3, 4].includes(file_type)) {
      throw new Error(`file_type 必须为 1(图片)|2(视频)|3(语音)|4(文件)，当前值: ${file_type}`);
    }

    if (!url && !file_data) {
      throw new Error('必须提供 url 或 file_data 其中之一');
    }

    const fileTypeNames = { 1: '图片', 2: '视频', 3: '语音', 4: '文件' };
    console.log(`[QQBot] 准备发送富媒体消息: 类型=${fileTypeNames[file_type]}, msgType=${this.msgType}, 输入方式=${url ? 'URL' : 'Base64'}`);

    // 2. 创建客户端实例
    const client = new QqbotClient({
      appId: this.appId,
      clientSecret: this.clientSecret,
      proxyUrl: this.proxyUrl,
    });

    // 3. 尝试从缓存获取（仅 URL 模式可缓存，base64 不缓存）
    let fileInfo = null;
    if (url) {
      const cacheKey = this._getMediaCacheKey(file_type, url);
      fileInfo = this._getCachedFileInfo(cacheKey);

      if (fileInfo) {
        console.log(`[QQBot] 使用缓存的 file_info (key=${cacheKey.substring(0, 50)}...)`);
      }
    }

    // 4. 缓存未命中或无URL时，执行上传
    if (!fileInfo) {
      try {
        const uploadResult = await client.uploadRichMedia(
          this.msgType,
          this.targetId,
          file_type,
          { url, file_data },
        );

        fileInfo = uploadResult.file_info;
        console.log(`[QQBot] 富媒体上传成功: file_uuid=${uploadResult.file_uuid}, ttl=${uploadResult.ttl}s`);

        // 仅对 URL 模式进行缓存
        if (url) {
          const cacheKey = this._getMediaCacheKey(file_type, url);
          this._setMediaCache(cacheKey, fileInfo, uploadResult.ttl);
          console.log(`[QQBot] file_info 已缓存 (ttl=${uploadResult.ttl}s)`);
        }
      } catch (error) {
        throw this._translateError(error);
      }
    }

    // 5. 构造富媒体消息体并发送
    const messageBody = {
      msgType: 7,
      media: { file_info: fileInfo },
      msgSeq: ++this._msgSeq,
    };

    console.log(`[QQBot] 准备发送富媒体消息到${this.msgType === 'group' ? '群聊' : '单聊'}: targetId=${this.targetId}`);

    try {
      let result;
      switch (this.msgType) {
        case 'group':
          result = await client.sendGroupMessage(this.targetId, messageBody);
          break;
        case 'c2c':
          result = await client.sendC2CMessage(this.targetId, messageBody);
          break;
        default:
          throw new Error(`不支持的消息场景: ${this.msgType}，仅支持 group(群聊) 或 c2c(单聊)`);
      }

      console.log(`[QQBot] 富媒体消息发送成功: ${JSON.stringify(result)}`);
      return { ...result, type: 'media' };
    } catch (error) {
      throw this._translateError(error);
    }
  }

  // ==================== file_info 内存缓存管理 ====================

  /**
   * 生成媒体缓存键
   * @param {number} fileType - 文件类型
   * @param {string} url - 资源URL
   * @returns {string} 缓存键
   */
  _getMediaCacheKey(fileType, url) {
    return `${this.msgType}:${fileType}:${url}`;
  }

  /**
   * 从缓存获取 file_info（自动检查过期）
   * @param {string} key - 缓存键
   * @returns {string|null} 有效的 file_info 或 null
   */
  _getCachedFileInfo(key) {
    const cached = this._mediaCache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() > cached.expireAt) {
      this._mediaCache.delete(key);
      return null;
    }

    return cached.fileInfo;
  }

  /**
   * 设置缓存条目
   * @param {string} key - 缓存键
   * @param {string} fileInfo - 文件信息
   * @param {number} ttl - 有效期（秒），0 表示长期有效
   */
  _setMediaCache(key, fileInfo, ttl) {
    // TTL 为 0 时设为长期有效（24小时作为安全上限）
    const expireAt = ttl > 0
      ? Date.now() + ttl * 1000
      : Date.now() + 24 * 60 * 60 * 1000;  // 24小时

    this._mediaCache.set(key, { fileInfo, expireAt });
  }

  /**
   * 清理过期的缓存条目（可选调用）
   */
  _cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this._mediaCache.entries()) {
      if (now > value.expireAt) {
        this._mediaCache.delete(key);
      }
    }
  }

  /**
   * 剥离 Markdown 格式标记，转为纯文本
   */
  _stripMarkdown(md) {
    return md
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/^>\s/gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }



  /**
   * 翻译 QQ API 错误码为用户友好的错误信息
   * 错误码参考: https://bot.q.qq.com/wiki/develop/api-v2/error.html
   */
  _translateError(error) {
    // 尝试从响应中提取错误码
    const errorCode = error.response?.data?.code;
    const errorMsg = error.response?.data?.message || error.message;

    const errorMap = {
      // 通用错误
      '10001': { message: '参数错误：请检查 AppID、AppSecret 或目标 ID 是否正确' },
      '10002': { message: '签名验证失败：请检查 AppSecret 是否正确' },
      '10003': { message: 'Access Token 无效或已过期' },

      // 频道相关
      '304001': { message: '频道不存在或机器人未加入该频道' },
      '304002': { message: '群不存在或机器人未加入该群' },
      '304003': { message: '用户不存在或未与机器人建立会话' },
      '304004': { message: '子频道不存在' },
      '304005': { message: '频道成员不存在' },

      // 消息相关
      '304061': { message: '无效的消息内容，请检查Markdown格式是否符合QQ规范（可能包含不支持的语法或特殊字符）' },
      '40034011': { message: '无效的Markdown格式，请确保使用正确的markdown对象结构' },

      // 富媒体相关
      '40035001': { message: '文件格式不支持，请检查文件类型是否正确（图片：png/jpg，视频：mp4，语音：silk/wav/mp3/flac）' },
      '40035002': { message: '文件大小超过限制，QQ API 对上传文件有大小限制' },
      '40035003': { message: '媒体URL无法访问或已失效，请确认URL可公网访问' },
      '40035004': { message: 'Base64数据格式错误或损坏，请重新编码' },
      '40035005': { message: 'file_info已过期或无效，系统会自动重新上传获取新的file_info' },
      '43001': { message: '消息内容为空' },
      '43002': { message: '消息内容过长（超过5000字符限制）' },
      '43003': { message: '消息格式错误' },
      '43004': { message: '发送消息频率过高，请稍后重试' },

      // 权限相关
      '50001': { message: '机器人缺少发送消息的权限' },
      '50005': { message: '机器人未在该频道/群中启用' },
      '50006': { message: '机器人被禁用或封禁' },
      '50007': { message: '用户已屏蔽机器人消息' },
      '50013': { message: 'API 调用次数超限' },
      '50014': { message: 'API 权限不足' },

      // 私信相关
      '53400': { message: '无法创建私信会话：请确保用户已与机器人有交互' },
      '53401': { message: '私信功能未开通' },

      // 网络/系统错误
      'ECONNREFUSED': { message: '无法连接到 QQ API 服务器，请检查网络或代理设置' },
      'ETIMEDOUT': { message: '连接 QQ API 服务器超时，请稍后重试' },
    };

    const translated = errorMap[String(errorCode)];
    if (translated) {
      return new Error(`QQBot API 错误 [${errorCode}]: ${translated.message}`);
    }

    // 如果没有匹配的错误码，返回原始错误但增加更友好的提示
    if (errorCode) {
      return new Error(`QQBot API 错误 [${errorCode}]: ${errorMsg}`);
    }

    // 其他未知错误
    return new Error(`QQBot 推送失败: ${errorMsg}`);
  }

  validate(config) {
    if (!config.appId || config.appId.trim() === '') {
      return { valid: false, message: 'AppID 不能为空' };
    }
    if (!config.token || config.token.trim() === '') {
      return { valid: false, message: 'AppSecret 不能为空' };
    }
    if (!config.msgType || !['group', 'c2c'].includes(config.msgType)) {
      return { valid: false, message: '消息类型必须是"群聊"或"单聊"' };
    }
    // targetId 不再强制要求，通过 WebSocket 绑定自动获取
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
    return 'QQ机器人';
  }

  static getDescription() {
    return '通过 QQ 官方机器人推送消息，支持群聊和单聊';
  }

  /**
   * 获取支持的通用消息类型
   * QQ Bot 支持：纯文本 和 Markdown
   */
  static getSupportedTypes() {
    return ['text', 'markdown', 'html'];
  }

  /**
   * 获取渠道特有的消息类型定义
   * 支持富媒体消息：图片/视频/语音/文件
   * 文档: https://bot.qq.com/wiki/develop/api-v2/server-inter/message/type/media.html
   * 上传API: https://bot.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html
   */
  static getChannelSpecificTypes() {
    return [
      {
        value: 'media',
        label: '富媒体消息',
        icon: '📎',
        description: '发送图片、视频、语音、文件等富媒体资源，采用先上传后发送的两步流程',
        fields: [
          {
            name: 'file_type',
            label: '媒体类型',
            type: 'select',
            required: true,
            options: [
              { value: 1, label: '图片 (png/jpg)' },
              { value: 2, label: '视频 (mp4)' },
              { value: 3, label: '语音 (silk/wav/mp3/flac)' },
              { value: 4, label: '文件（通用格式）' },
            ],
            description: '选择要发送的媒体资源类型',
          },
          {
            name: 'url',
            label: '媒体URL',
            type: 'url',
            required: false,
            description: '媒体资源的公网可访问URL（优先使用此方式）',
          },
          {
            name: 'file_data',
            label: '文件数据(Base64)',
            type: 'textarea',
            required: false,
            description: '文件的Base64编码内容（当无法提供URL时使用此方式，注意：大文件会导致请求体过大）',
          },
        ],
        example: {
          title: '',
          content: '',
          extraData: {
            qqbot: {
              file_type: 1,
              url: 'https://example.com/image.png',
            }
          },
        },
      },
    ];
  }

  static getConfigFields() {
    return [
      {
        name: 'appId',
        label: 'AppID',
        type: 'text',
        required: true,
        placeholder: 'QQ开放平台机器人的 AppID',
        description: '在 QQ 开放平台 (q.qq.com) 创建机器人后获取',
      },
      {
        name: 'token',
        label: 'AppSecret（应用密钥）',
        type: 'password',
        required: true,
        placeholder: '机器人的 AppSecret',
        description: '用于自动获取 Access Token，系统会自动管理 Token 的获取和刷新',
      },
      {
        name: 'msgType',
        label: '推送场景',
        type: 'select',
        required: true,
        options: [
          { value: 'group', label: '群聊消息（推荐）' },
          { value: 'c2c', label: '单聊消息/消息列表' },
        ],
        description: '群聊和单聊均为官方标准 API，可根据使用场景选择',
      },
      {
        name: 'proxyUrl',
        label: '代理地址',
        type: 'text',
        required: false,
        placeholder: '如 http://127.0.0.1:7890 或 socks5://127.0.0.1:1080',
        description: '可选，用于访问 QQ API 的代理地址（国内服务器通常不需要）',
      },
    ];
  }
}

module.exports = QqbotChannel;
