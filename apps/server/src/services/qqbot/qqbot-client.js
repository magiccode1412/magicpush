const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('../../utils/logger');

/**
 * Access Token 管理器
 * 负责自动获取、缓存和刷新 QQ Bot Access Token
 *
 * 接口地址: https://bots.qq.com/app/getAppAccessToken
 * 文档: https://bot.q.qq.com/wiki/
 */
class TokenManager {
  constructor() {
    // 缓存 Map: key=appId, value={accessToken, expireAt}
    this.cache = new Map();
    // 提前刷新时间（秒），避免临界时刻失效
    this.refreshBuffer = 300; // 5分钟
  }

  /**
   * 获取 Access Token
   * 如果缓存有效则直接返回，否则从服务器获取新的
   *
   * @param {string} appId - 应用 AppID
   * @param {string} clientSecret - 应用密钥
   * @param {Object} [options] - 可选配置
   * @param {string} [options.proxyUrl] - 代理地址
   * @returns {Promise<string>} - Access Token
   */
  async getAccessToken(appId, clientSecret, options = {}) {
    const cacheKey = appId;
    const cached = this.cache.get(cacheKey);

    // 检查缓存是否有效（提前 refreshBuffer 秒刷新）
    if (cached && cached.expireAt > Date.now()) {
      return cached.accessToken;
    }

    return this._fetchNewToken(appId, clientSecret, options);
  }

  /**
   * 从服务器获取新的 Access Token
   */
  async _fetchNewToken(appId, clientSecret, options = {}) {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      };

      // 支持代理
      if (options.proxyUrl) {
        const agent = this._createAgent(options.proxyUrl);
        if (agent) config.httpsAgent = agent;
      }

      logger.info(`QQBot 正在获取新 Access Token: appId=${appId}`);
      const response = await axios.post(
        'https://bots.qq.com/app/getAppAccessToken',
        {
          appId: appId,
          clientSecret: clientSecret,
        },
        config
      );

      const data = response.data;
      if (!data || !data.access_token) {
        throw new Error(`获取 Access Token 失败: ${JSON.stringify(data)}`);
      }

      const accessToken = data.access_token;
      const expiresIn = data.expires_in || 7200; // 默认2小时

      // 缓存 token，提前 refreshBuffer 秒过期以避免临界问题
      const expireAt = Date.now() + (expiresIn - this.refreshBuffer) * 1000;

      this.cache.set(appId, {
        accessToken,
        expireAt,
      });

      logger.info(`QQBot Access Token 获取成功，有效期至 ${new Date(expireAt).toLocaleString()}`);
      return accessToken;
    } catch (error) {
      logger.error(`QQBot 获取 Access Token 异常: ${error.message}`);
      throw new Error(`QQBot 获取 Access Token 失败: ${error.message}`);
    }
  }

  /**
   * 清除指定应用的缓存
   */
  invalidate(appId) {
    this.cache.delete(appId);
    logger.info(`QQToken 已清除缓存: appId=${appId}`);
  }

  /**
   * 创建代理 Agent
   */
  _createAgent(proxyUrl) {
    if (!proxyUrl || proxyUrl.trim() === '') return null;
    try {
      const url = new URL(proxyUrl);
      const protocol = url.protocol.replace(':', '').toLowerCase();
      if (protocol === 'socks' || protocol === 'socks5' || protocol === 'socks4') {
        return new SocksProxyAgent(proxyUrl);
      }
      return new HttpsProxyAgent(proxyUrl);
    } catch (e) {
      logger.warn(`创建代理 Agent 失败: ${e.message}`);
      return null;
    }
  }
}

// 全局单例实例
const tokenManager = new TokenManager();

/**
 * QQ 官方机器人 API 客户端
 * 封装 QQ OpenAPI 的 HTTP 交互，包含 Token 管理和消息发送
 *
 * API 文档: https://bot.q.qq.com/wiki/develop/api-v2/
 * 基础 URL: https://api.sgroup.qq.com（沙箱: https://sandbox.api.sgroup.qq.com）
 * 鉴权方式: Authorization: QQBot ${accessToken}（推荐）或 Bot ${appId}.${token}（已弃用）
 */
class QqbotClient {
  /**
   * @param {Object} options
   * @param {string} options.appId - 机器人 AppID
   * @param {string} options.clientSecret - 应用密钥（用于获取 Access Token）
   * @param {string} [options.baseUrl] - API 基础地址，默认 https://api.sgroup.qq.com
   * @param {string} [options.proxyUrl] - 代理地址
   */
  constructor({ appId, clientSecret, baseUrl = 'https://api.sgroup.qq.com', proxyUrl }) {
    if (!appId || !clientSecret) {
      throw new Error('QQBot 初始化失败: 缺少 appId 或 clientSecret');
    }

    this.appId = appId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.proxyUrl = proxyUrl;
    this._agent = this._createAgent(proxyUrl);
  }

  /**
   * 创建代理 Agent
   */
  _createAgent(proxyUrl) {
    if (!proxyUrl || proxyUrl.trim() === '') return null;
    try {
      const url = new URL(proxyUrl);
      const protocol = url.protocol.replace(':', '').toLowerCase();
      if (protocol === 'socks' || protocol === 'socks5' || protocol === 'socks4') {
        return new SocksProxyAgent(proxyUrl);
      }
      return new HttpsProxyAgent(proxyUrl);
    } catch (e) {
      logger.warn(`创建代理 Agent 失败: ${e.message}`);
      return null;
    }
  }

  /**
   * 构建请求配置（包含自动鉴权）
   * 使用 Access Token 进行鉴权
   */
  async _requestConfig() {
    const accessToken = await tokenManager.getAccessToken(
      this.appId,
      this.clientSecret,
      { proxyUrl: this.proxyUrl }
    );

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `QQBot ${accessToken}`, // 使用官方推荐的 Access Token 鉴权
        'User-Agent': 'MagicPush/QQBot',
      },
      timeout: 15000,
    };

    if (this._agent) {
      config.httpsAgent = this._agent;
    }

    return config;
  }

  /**
   * 发送群聊消息
   * POST /v2/groups/{group_id}/messages
   *
   * @param {string} groupId - 群 ID
   * @param {Object} message
   * @param {string} message.content - 消息文本内容
   * @param {number} [message.msgType] - 消息类型: 0(文本) 2(markdown)
   * @param {string} [message.eventId] - 要回复的事件 ID（可选）
   * @param {number} [message.msgSeq] - 消息序号，用于去重（可选）
   * @returns {Promise<Object>} - 发送结果
   */
  async sendGroupMessage(groupId, message) {
    let body;

    // QQ机器人消息格式处理
    if (message.msgType === 2) {
      // Markdown消息：需要使用 markdown 对象包裹（官方文档要求）
      body = {
        msg_type: 2,
        markdown: {
          content: message.content,
        },
      };
      logger.info(`[DEBUG] 构造的Markdown请求体: ${JSON.stringify(body, null, 2)}`);
    } else if (message.msgType === 7 && message.media) {
      // 富媒体消息：使用 media 字段传递 file_info
      body = {
        msg_type: 7,
        media: message.media,
      };
      logger.info(`[DEBUG] 构造的富媒体请求体: ${JSON.stringify(body, null, 2)}`);
    } else {
      body = { content: message.content };
      if (message.msgType !== undefined) {
        body.msg_type = message.msgType;
      }
    }

    if (message.eventId) {
      body.event_id = message.eventId;
    }
    if (message.msgSeq !== undefined) {
      body.msg_seq = message.msgSeq;
    }

    logger.info(`QQBot 发送群消息: groupId=${groupId}, type=${
      message.msgType === 2 ? 'markdown' : message.msgType === 7 ? 'rich_media' : 'text'
    }, contentLength=${message.content?.length || 0}`);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/groups/${groupId}/messages`,
        body,
        await this._requestConfig()
      );
      return response.data;
    } catch (error) {
      // 打印详细的错误响应
      logger.error(`[ERROR] QQBot API 响应错误详情:`);
      logger.error(`[ERROR]   Status: ${error.response?.status}`);
      logger.error(`[ERROR]   Response Data: ${JSON.stringify(error.response?.data, null, 2)}`);
      logger.error(`[ERROR]   Request Body (前500字符): ${JSON.stringify(body).substring(0, 500)}`);
      throw error;
    }
  }

  /**
   * 发送 C2C 单聊消息（消息列表私聊）
   * POST /v2/users/{user_id}/messages
   *
   * @param {string} userId - 用户 ID（openid）
   * @param {Object} message
   * @param {string} message.content - 消息文本内容
   * @param {number} [message.msgType] - 消息类型: 0(文本) 2(markdown)
   * @param {string} [message.eventId] - 要回复的事件 ID（可选）
   * @param {number} [message.msgSeq] - 消息序号，用于去重（可选）
   * @returns {Promise<Object>} - 发送结果
   */
  async sendC2CMessage(userId, message) {
    let body;

    // QQ机器人消息格式处理
    if (message.msgType === 2) {
      // Markdown消息：需要使用 markdown 对象包裹（官方文档要求）
      body = {
        msg_type: 2,
        markdown: {
          content: message.content,
        },
      };
      logger.info(`[DEBUG] 构造的Markdown请求体: ${JSON.stringify(body, null, 2)}`);
    } else if (message.msgType === 7 && message.media) {
      // 富媒体消息：使用 media 字段传递 file_info
      body = {
        msg_type: 7,
        media: message.media,
      };
      logger.info(`[DEBUG] 构造的富媒体请求体: ${JSON.stringify(body, null, 2)}`);
    } else {
      body = { content: message.content };
      if (message.msgType !== undefined) {
        body.msg_type = message.msgType;
      }
    }

    if (message.eventId) {
      body.event_id = message.eventId;
    }
    if (message.msgSeq !== undefined) {
      body.msg_seq = message.msgSeq;
    }

    logger.info(`QQBot 发送 C2C 消息: userId=${userId}, type=${
      message.msgType === 2 ? 'markdown' : message.msgType === 7 ? 'rich_media' : 'text'
    }, contentLength=${message.content?.length || 0}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/users/${userId}/messages`,
        body,
        await this._requestConfig()
      );
      return response.data;
    } catch (error) {
      // 打印详细的错误响应
      logger.error(`[ERROR] QQBot API 响应错误详情:`);
      logger.error(`[ERROR]   Status: ${error.response?.status}`);
      logger.error(`[ERROR]   Response Data: ${JSON.stringify(error.response?.data, null, 2)}`);
      logger.error(`[ERROR]   Request Body (前500字符): ${JSON.stringify(body).substring(0, 500)}`);
      throw error;
    }
  }

  /**
   * 上传富媒体资源
   * 先调用此接口获取 file_info，再通过发送消息接口的 media 字段使用
   * API 文档: https://bot.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html
   *
   * @param {string} targetType - 目标类型: 'group'(群聊) | 'c2c'(单聊)
   * @param {string} targetId - 目标 ID（群 openid 或用户 openid）
   * @param {number} fileType - 媒体类型: 1(图片) | 2(视频) | 3(语音) | 4(文件)
   * @param {Object} mediaInput - 媒体输入
   * @param {string} [mediaInput.url] - 媒体资源的公网可访问 URL（推荐）
   * @param {string} [mediaInput.file_data] - 文件的 Base64 编码内容（无URL时使用）
   * @returns {Promise<Object>} 返回 { file_uuid, file_info, ttl }
   */
  async uploadRichMedia(targetType, targetId, fileType, mediaInput) {
    // 参数校验
    if (!targetType || !['group', 'c2c'].includes(targetType)) {
      throw new Error(`uploadRichMedia: targetType 必须为 'group' 或 'c2c'，当前值: ${targetType}`);
    }
    if (!targetId || typeof targetId !== 'string') {
      throw new Error('uploadRichMedia: targetId 不能为空且必须为字符串');
    }
    if (!fileType || ![1, 2, 3, 4].includes(fileType)) {
      throw new Error(`uploadRichMedia: fileType 必须为 1(图片)|2(视频)|3(语音)|4(文件)，当前值: ${fileType}`);
    }
    if (!mediaInput || (!mediaInput.url && !mediaInput.file_data)) {
      throw new Error('uploadRichMedia: 必须提供 url 或 file_data 其中之一');
    }

    // 构造上传端点（群聊和单聊使用不同路径）
    const endpoint = targetType === 'group'
      ? `/v2/groups/${targetId}/files`
      : `/v2/users/${targetId}/files`;

    // 构造请求体
    const body = {
      file_type: fileType,
    };

    if (mediaInput.url) {
      body.url = mediaInput.url;
    } else if (mediaInput.file_data) {
      body.file_data = mediaInput.file_data;
    }

    logger.info(`QQBot 上传富媒体: targetType=${targetType}, fileType=${fileType}, hasUrl=${!!mediaInput.url}, hasFileData=${!!mediaInput.file_data}`);

    try {
      const config = await this._requestConfig();
      // 上传大文件可能较慢，timeout 设为 30s
      config.timeout = 30000;

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        body,
        config
      );

      const data = response.data;

      // 验证返回数据
      if (!data || !data.file_info) {
        logger.error(`[ERROR] QQBot 富媒体上传响应异常: ${JSON.stringify(data)}`);
        throw new Error(`QQBot 富媒体上传失败: 未返回有效的 file_info，响应=${JSON.stringify(data)}`);
      }

      logger.info(`QQBot 富媒体上传成功: file_uuid=${data.file_uuid || 'N/A'}, ttl=${data.ttl || 'N/A'}`);

      return {
        file_uuid: data.file_uuid,
        file_info: data.file_info,
        ttl: data.ttl,
      };
    } catch (error) {
      // 打印详细错误信息
      logger.error(`[ERROR] QQBot 富媒体上传失败详情:`);
      logger.error(`[ERROR]   Target: ${targetType}/${targetId}`);
      logger.error(`[ERROR]   FileType: ${fileType}`);
      logger.error(`[ERROR]   Status: ${error.response?.status}`);
      logger.error(`[ERROR]   Response Data: ${JSON.stringify(error.response?.data, null, 2)}`);
      throw error;
    }
  }

  /**
   * 测试连接：验证 AppID 和 ClientSecret 是否有效
   * 通过尝试获取 Access Token 来验证配置是否正确
   *
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection() {
    try {
      // 尝试获取 token 来验证配置
      await this._requestConfig();
      return { success: true, message: 'QQ机器人配置验证成功' };
    } catch (error) {
      return { success: false, message: `QQ机器人配置错误: ${error.message}` };
    }
  }
}

// 导出类和TokenManager实例（用于测试和管理）
QqbotClient.tokenManager = tokenManager;

module.exports = QqbotClient;
