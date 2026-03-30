const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('../../utils/logger');

/**
 * QQ 官方机器人 API 客户端
 * 封装 QQ OpenAPI 的 HTTP 交互，包含 Token 管理和消息发送
 *
 * API 文档: https://bot.q.qq.com/wiki/develop/api-v2/
 * 基础 URL: https://api.sgroup.qq.com
 * 鉴权方式: Authorization: Bot ${appID}.${token}
 */
class QqbotClient {
  /**
   * @param {Object} options
   * @param {string} options.appId - 机器人 AppID
   * @param {string} options.token - 机器人鉴权 Token（Access Token）
   * @param {string} [options.baseUrl] - API 基础地址，默认 https://api.sgroup.qq.com
   * @param {string} [options.proxyUrl] - 代理地址
   */
  constructor({ appId, token, baseUrl = 'https://api.sgroup.qq.com', proxyUrl }) {
    this.appId = appId;
    this.token = token;
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
   * 构建请求配置
   */
  _requestConfig() {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${this.appId}.${this.token}`,
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
   * 创建私信会话
   * POST /users/@me/dms
   *
   * @param {string} recipientId - 接收用户的 ID（openid）
   * @param {string} [sourceGuildId] - 来源频道 ID（可选，部分场景需要）
   * @returns {Promise<{id: string}>} - 返回私信频道 guild_id
   */
  async createDMS(recipientId, sourceGuildId) {
    const body = {
      recipient_id: recipientId,
    };
    if (sourceGuildId) {
      body.source_guild_id = sourceGuildId;
    }

    logger.info(`QQBot 创建私信会话: recipientId=${recipientId}`);
    const response = await axios.post(
      `${this.baseUrl}/users/@me/dms`,
      body,
      this._requestConfig()
    );

    const data = response.data;
    if (!data || !data.id) {
      throw new Error(`QQBot 创建私信会话失败: ${JSON.stringify(data)}`);
    }

    logger.info(`QQBot 私信会话创建成功: guildId=${data.id}`);
    return data;
  }

  /**
   * 发送私信消息
   * POST /dms/{guild_id}/messages
   *
   * @param {string} guildId - 私信频道 ID（由 createDMS 返回）
   * @param {Object} message
   * @param {string} message.content - 消息文本内容
   * @param {string} [message.msgId] - 回复的消息 ID（可选）
   * @returns {Promise<Object>} - 发送结果
   */
  async sendDMSMessage(guildId, message) {
    const body = { content: message.content };
    if (message.msgId) {
      body.msg_id = message.msgId;
    }

    logger.info(`QQBot 发送私信: guildId=${guildId}`);
    const response = await axios.post(
      `${this.baseUrl}/dms/${guildId}/messages`,
      body,
      this._requestConfig()
    );

    return response.data;
  }

  /**
   * 发送子频道消息
   * POST /channels/{channel_id}/messages
   *
   * @param {string} channelId - 子频道 ID
   * @param {Object} message
   * @param {string} message.content - 消息文本内容
   * @param {number} [message.msgType] - 消息类型: 0(文本) 2(markdown)
   * @param {string} [message.msgId] - 回复的消息 ID（可选）
   * @returns {Promise<Object>} - 发送结果
   */
  async sendChannelMessage(channelId, message) {
    const body = { content: message.content };
    if (message.msgType !== undefined) {
      body.msg_type = message.msgType;
    }
    if (message.msgId) {
      body.msg_id = message.msgId;
    }

    logger.info(`QQBot 发送频道消息: channelId=${channelId}`);
    const response = await axios.post(
      `${this.baseUrl}/channels/${channelId}/messages`,
      body,
      this._requestConfig()
    );

    return response.data;
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
    const body = { content: message.content };
    if (message.msgType !== undefined) {
      body.msg_type = message.msgType;
    }
    if (message.eventId) {
      body.event_id = message.eventId;
    }
    if (message.msgSeq !== undefined) {
      body.msg_seq = message.msgSeq;
    }

    logger.info(`QQBot 发送群消息: groupId=${groupId}`);
    const response = await axios.post(
      `${this.baseUrl}/v2/groups/${groupId}/messages`,
      body,
      this._requestConfig()
    );

    return response.data;
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
    const body = { content: message.content };
    if (message.msgType !== undefined) {
      body.msg_type = message.msgType;
    }
    if (message.eventId) {
      body.event_id = message.eventId;
    }
    if (message.msgSeq !== undefined) {
      body.msg_seq = message.msgSeq;
    }

    logger.info(`QQBot 发送 C2C 消息: userId=${userId}`);
    const response = await axios.post(
      `${this.baseUrl}/v2/users/${userId}/messages`,
      body,
      this._requestConfig()
    );

    return response.data;
  }
}

module.exports = QqbotClient;
