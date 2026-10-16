const WebSocket = require('ws');
const QqbotClient = require('./qqbot-client');
const logger = require('../../utils/logger');

// ── 常量 ──────────────────────────────────────────────────────────────
// QQ Bot WebSocket 网关地址（生产环境）
// 也可以通过 GET /gateway/bot 动态获取
const DEFAULT_WS_GATEWAY_URL = 'wss://api.sgroup.qq.com/websocket';

// 心跳间隔（毫秒），实际以 Hello 返回的 heartbeat_interval 为准
const DEFAULT_HEARTBEAT_INTERVAL_MS = 45000;

// 心跳超时阈值（连续几次未收到 ACK 触发重连）
const HEARTBEAT_TIMEOUT_THRESHOLD = 3;

// 重连延迟策略（指数退避）
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000, 60000];
const MAX_RECONNECT_ATTEMPTS = 50;

// Intents：订阅的事件类型
// 1 << 25: C2C_MESSAGE_CREATE + GROUP_AT_MESSAGE_CREATE + FRIEND_ADD（群聊与单聊）
// 1 << 30: AT_MESSAGE_CREATE + PUBLIC_MESSAGE_DELETE（公域频道消息）
// 合计值用于同时监听群聊@和单聊消息
const DEFAULT_INTENTS = (1 << 25) | (1 << 30);

/**
 * QQ Bot WebSocket 客户端
 *
 * 功能：
 *  - 建立 WSS 长连接到 QQ 机器人网关
 *  - 使用 Access Token 完成 Identify 鉴权
 *  - 心跳保活（自适应间隔）
 *  - 断线自动重连 + Resume 恢复
 *  - 监听入站消息事件（用于提取 OpenID 完成绑定）
 */
class QqbotWsClient {
  /**
   * @param {Object} config
   * @param {string} config.appId - 机器人 AppID
   * @param {string} config.clientSecret - 应用密钥（用于换取 Access Token）
   * @param {string} [config.wsUrl] - 自定义 WS 网关地址
   * @param {string} [config.proxyUrl] - 代理地址
   */
  constructor(config) {
    this.appId = config.appId;
    this.clientSecret = config.clientSecret;
    this.wsUrl = config.wsUrl || DEFAULT_WS_GATEWAY_URL;
    this.proxyUrl = config.proxyUrl || null;

    // 连接状态机: disconnected | connecting | identifying | connected | reconnecting | resuming
    this.state = 'disconnected';
    this.ws = null;

    // Ready 信息
    this.sessionId = null;       // 会话 ID（用于 Resume）
    this.botUserId = null;       // 机器人自身 ID
    this.botUsername = null;     // 机器人用户名
    this.resumeUrl = null;       // Resume 地址（断线重连用）

    // 心跳
    this.heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.heartbeatTimer = null;
    this.heartbeatAckReceived = true;
    this.lastHeartbeatAt = 0;
    this.heartbeatTimeoutCount = 0;

    // 序列号（用于心跳和 Resume）
    this.lastSequenceNumber = null;

    // 重连控制
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.disposed = false;

    // 回调
    this.onReady = null;         // () => void           鉴权成功回调
    this.onError = null;         // (Error) => void       错误回调
    this.onDispatch = null;      // (event) => void       入站消息事件回调
    this.onStateChange = null;   // (state) => void       状态变化回调
  }

  // ── 公开方法 ──────────────────────────────────────────────────────

  connect() {
    if (this.disposed) {
      throw new Error('Client has been disposed');
    }
    logger.info(`[qqbot-ws] 开始连接: appId=${this.appId}, url=${this.wsUrl}`);
    this._doConnect();
  }

  disconnect() {
    logger.info(`[qqbot-ws] 主动断开连接: appId=${this.appId}`);
    this.disposed = true;
    this._cleanup();
  }

  getState() {
    return this.state;
  }

  /**
   * 获取机器人自身 ID（Ready 后可用）
   */
  getBotId() {
    return this.botUserId;
  }

  // ── 私有方法：连接生命周期 ─────────────────────────────────────────

  async _doConnect() {
    if (this.disposed) return;
    this._setState('connecting');

    // 1. 先获取 Access Token
    try {
      await QqbotClient.tokenManager.getAccessToken(this.appId, this.clientSecret);
    } catch (err) {
      logger.error(`[qqbot-ws] 获取 Access Token 失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
      return;
    }

    if (this.disposed) return;

    // 2. 可选：通过 REST API 获取网关地址
    let wsUrl = this.wsUrl;
    try {
      const gatewayInfo = await this._fetchGateway();
      if (gatewayInfo && gatewayInfo.url) {
        wsUrl = gatewayInfo.url;
        this.resumeUrl = gatewayInfo.resume_url || null;
        logger.info(`[qqbot-ws] 使用动态网关地址: ${wsUrl}`);
      }
    } catch (e) {
      logger.warn(`[qqbot-ws] 获取网关地址失败，使用默认地址: ${e.message}`);
    }

    if (this.disposed) return;

    // 3. 建立 WebSocket 连接
    logger.info(`[qqbot-ws] 正在建立 WS 连接: ${wsUrl}`);

    try {
      const wsOptions = {};
      if (this.proxyUrl) {
        const { HttpsProxyAgent } = require('https-proxy-agent') || {};
        if (HttpsProxyAgent) {
          wsOptions.agent = new HttpsProxyAgent(this.proxyUrl);
        } else {
          logger.warn(`[qqbot-ws] https-proxy-agent 未安装，代理设置无效`);
        }
      }
      this.ws = new WebSocket(wsUrl, wsOptions);
    } catch (err) {
      logger.error(`[qqbot-ws] 创建 WebSocket 实例失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      logger.info(`[qqbot-ws] WS 已连接, 等待 Hello...`);
      // 等待服务端发送 Hello (op:10)
    });

    this.ws.on('message', (raw) => {
      this._onMessage(raw);
    });

    this.ws.on('close', (code, reason) => {
      const reasonStr = Buffer.isBuffer(reason) ? reason.toString('utf-8') : String(reason || '');
      logger.info(`[qqbot-ws] WS 关闭: code=${code}, reason=${reasonStr}`);
      this._stopHeartbeat();
      this.onError?.(new Error(`WS closed: code=${code}, reason=${reasonStr}`));

      if (!this.disposed && code !== 1000) {
        this._scheduleReconnect();
      } else {
        this._setState('disconnected');
      }
    });

    this.ws.on('error', (err) => {
      logger.error(`[qqbot-ws] WS 错误: ${err.message}`);
      this.onError?.(err);
    });
  }

  _onMessage(raw) {
    let payload;
    try {
      const text = Buffer.isBuffer(raw) ? raw.toString('utf-8') : raw;
      payload = JSON.parse(text);
    } catch (err) {
      logger.warn(`[qqbot-ws] 解析 JSON 失败: ${err.message}`);
      return;
    }

    const op = payload.op;
    const d = payload.d || {};
    const s = payload.s ?? null;
    const t = payload.t || null;

    logger.debug(`[qqbot-ws] 收到消息: op=${op}, t=${t}, s=${s}`);

    // 更新序列号
    if (s != null && (this.lastSequenceNumber == null || s > this.lastSequenceNumber)) {
      this.lastSequenceNumber = s;
    }

    switch (op) {
      case 10: // Hello
        this._onHello(d);
        break;

      case 0: // Dispatch（事件推送）
        this._onDispatch(t, d, s);
        break;

      case 11: // Heartbeat ACK
        this._onHeartbeatAck();
        break;

      case 9: // 需要重新鉴权（Token 过期等）
        logger.warn(`[qqbot-ws] 收到 op=9，需要重新鉴权`);
        this._invalidateTokenAndReconnect();
        break;

      default:
        logger.debug(`[qqbot-ws] 未处理的 op=${op}`);
    }
  }

  /**
   * Hello (op=10)：连接建立后服务端发送的第一条消息
   * 包含心跳间隔信息
   */
  _onHello(d) {
    if (d.heartbeat_interval) {
      this.heartbeatIntervalMs = Math.min(Math.max(d.heartbeat_interval, 15000), 120000);
      logger.info(`[qqbot-ws] 收到 Hello: heartbeat_interval=${d.heartbeat_interval}ms`);
    }

    // 发送 Identify 进行鉴权
    this._sendIdentify();
  }

  /**
   * 发送 Identify (op=2)：鉴权请求
   * 包含 Access Token、Intents、分片参数
   */
  async _sendIdentify() {
    this._setState('identifying');

    let token;
    try {
      token = await QqbotClient.tokenManager.getAccessToken(this.appId, this.clientSecret);
    } catch (err) {
      logger.error(`[qqbot-ws] Identify: 获取 Token 失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
      return;
    }

    const identifyPayload = {
      op: 2,
      d: {
        token: `QQBot ${token}`,
        intents: DEFAULT_INTENTS,
        properties: {
          $os: process.platform,
          $browser: 'magicpush',
          $device: 'magicpush',
        },
        shard: [0, 1], // 单分片
      },
    };

    logger.info(`[qqbot-ws] 发送 Identify: appId=${this.appId}, intents=${DEFAULT_INTENTS}`);

    try {
      this._sendRaw(identifyPayload);
    } catch (err) {
      logger.error(`[qqbot-ws] Identify 发送失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
    }
  }

  /**
   * 发送 Resume (op=6)：断线恢复
   * 用于快速恢复之前的会话，补发遗漏事件
   */
  _sendResume() {
    this._setState('resuming');

    const resumePayload = {
      op: 6,
      d: {
        token: '', // Resume 不需要新 token，但格式要求有
        session_id: this.sessionId,
        seq: this.lastSequenceNumber || 0,
      },
    };

    logger.info(`[qqbot-ws] 发送 Resume: sessionId=${this.sessionId}, seq=${this.lastSequenceNumber}`);

    try {
      this._sendRaw(resumePayload);
    } catch (err) {
      logger.error(`[qqbot-ws] Resume 发送失败: ${err.message}`);
      // Resume 失败，降级为完整重新连接
      this._doConnect();
    }
  }

  /**
   * Dispatch (op=0)：事件分发
   * 根据事件类型 (t) 分发到不同处理器
   */
  _onDispatch(eventType, eventData, seq) {
    switch (eventType) {
      case 'READY':
        this._onReady(eventData);
        break;

      case 'RESUMED':
        this._onResumed();
        break;

      // === 消息事件（核心：提取 OpenID）===
      case 'C2C_MESSAGE_CREATE':           // 单聊消息
        this._handleC2CMessageCreate(eventData);
        break;

      case 'GROUP_AT_MESSAGE_CREATE':      // 群聊 @机器人 消息
        this._handleGroupAtMessageCreate(eventData);
        break;

      case 'GROUP_MESSAGE_CREATE':         // 群聊全量消息（需私域权限）
        this._handleGroupMessageCreate(eventData);
        break;

      case 'AT_MESSAGE_CREATE':            // 频道 @消息
      case 'MESSAGE_CREATE':               // 频道全量消息（私域）
        this._handleChannelMessage(eventType, eventData);
        break;

      case 'DIRECT_MESSAGE_CREATE':        // 频道私信
        this._handleDirectMessage(eventData);
        break;

      default:
        // 其他事件原样传递给上层
        this.onDispatch?.({
          type: eventType,
          data: eventData,
          seq,
        });
    }
  }

  /**
   * READY 事件：鉴权成功
   */
  _onReady(d) {
    const user = d.user || {};
    this.sessionId = d.session_id || null;
    this.botUserId = user.id || null;
    this.botUsername = user.username || null;
    this.resumeUrl = d.resume_gateway_url || null;

    this.reconnectAttempts = 0;
    this._setState('connected');

    logger.info(
      `[qqbot-ws] ✅ Ready! sessionId=${this.sessionId}, botId=${this.botUserId}, botName=${this.botUsername}`
    );

    this._startHeartbeat(true);

    this.onReady?.({
      sessionId: this.sessionId,
      botId: this.botUserId,
      botUsername: this.botUsername,
      resumeUrl: this.resumeUrl,
    });
  }

  /**
   * RESUMED 事件：断线恢复成功
   */
  _onResumed() {
    this.reconnectAttempts = 0;
    this._setState('connected');
    logger.info('[qqbot-ws] ✅ Resumed! 已恢复连接');
    this._startHeartbeat(true);
  }

  // ── 消息事件处理器（核心：提取 OpenID）──────────────────────────────

  /**
   * C2C_MESSAGE_CREATE：单聊消息
   * 提取字段: author.user_openid（用户唯一标识）
   */
  _handleC2CMessageCreate(data) {
    const author = data.author || {};
    const userOpenid = author.user_openid;
    const content = data.content || '';
    const msgId = data.id;

    logger.info(
      `[qqbot-ws] 📩 收到单聊(C2C)消息: user_openid=${userOpenid}, content="${content.substring(0, 50)}", msgId=${msgId}`
    );

    this.onDispatch?.({
      type: 'c2c_message',
      userOpenid,
      author,
      content,
      msgId,
      timestamp: data.timestamp,
      attachments: data.attachments,
      rawEvent: data,
    });
  }

  /**
   * GROUP_AT_MESSAGE_CREATE：群聊 @机器人 消息
   * 提取字段:
   *   - group_openid（群标识）— 顶层字段
   *   - author.member_openid（用户在群内的标识）
   */
  _handleGroupAtMessageCreate(data) {
    const groupOpenid = data.group_openid;
    const author = data.author || {};
    const memberOpenid = author.member_openid;
    const content = data.content || '';
    const msgId = data.id;

    logger.info(
      `[qqbot-ws] 📩 收到群聊@消息: group_openid=${groupOpenid}, member_openid=${memberOpenid}, content="${content.substring(0, 50)}"`
    );

    this.onDispatch?.({
      type: 'group_at_message',
      groupOpenid,
      memberOpenid,
      author,
      content,
      msgId,
      timestamp: data.timestamp,
      attachments: data.attachments,
      rawEvent: data,
    });
  }

  /**
   * GROUP_MESSAGE_CREATE：群聊全量消息（需私域权限）
   */
  _handleGroupMessageCreate(data) {
    const groupOpenid = data.group_openid;
    const author = data.author || {};
    const memberOpenid = author.member_openid;
    const content = data.content || '';

    logger.info(
      `[qqbot-ws] 📩 收到群聊全量消息: group_openid=${groupOpenid}, member_openid=${memberOpenid}`
    );

    this.onDispatch?.({
      type: 'group_message',
      groupOpenid,
      memberOpenid,
      author,
      content,
      msgId: data.id,
      timestamp: data.timestamp,
      rawEvent: data,
    });
  }

  /**
   * AT_MESSAGE_CREATE / MESSAGE_CREATE：频道消息
   * 提取字段: author.id（用户ID）、guild_id、channel_id
   */
  _handleChannelMessage(eventType, data) {
    const guildId = data.guild_id;
    const channelId = data.channel_id;
    const author = data.author || {};
    const userId = author.id;
    const content = data.content || '';

    logger.info(
      `[qqbot-ws] 📩 收到频道消息(${eventType}): guild=${guildId}, channel=${channelId}, userId=${userId}`
    );

    this.onDispatch?.({
      type: eventType === 'AT_MESSAGE_CREATE' ? 'at_channel_message' : 'channel_message',
      guildId,
      channelId,
      userId,
      author,
      content,
      msgId: data.id,
      timestamp: data.timestamp,
      rawEvent: data,
    });
  }

  /**
   * DIRECT_MESSAGE_CREATE：频道私信
   * 提取字段: author.id（用户ID）、guild_id
   */
  _handleDirectMessage(data) {
    const author = data.author || {};
    const userId = author.id;
    const guildId = data.guild_id;
    const content = data.content || '';

    logger.info(`[qqbot-ws] 📩 收到频道私信: userId=${userId}, guild=${guildId}`);

    this.onDispatch?.({
      type: 'direct_message',
      userId,
      guildId,
      author,
      content,
      msgId: data.id,
      timestamp: data.timestamp,
      rawEvent: data,
    });
  }

  // ── 心跳 ──────────────────────────────────────────────────────────

  _startHeartbeat(isFirst = false) {
    this._stopHeartbeat();
    this.heartbeatAckReceived = true;
    if (isFirst) this.heartbeatTimeoutCount = 0;

    // 首次心跳延迟几秒启动，后续按 interval 执行
    const delayMs = isFirst ? 5000 : this.heartbeatIntervalMs;
    logger.debug(`[qqbot-ws] 心跳定时: ${delayMs}ms 后`);

    this.heartbeatTimer = setTimeout(() => {
      this._sendHeartbeat();
    }, delayMs);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _sendHeartbeat() {
    // 上次心跳未收到 ACK
    if (!this.heartbeatAckReceived) {
      this.heartbeatTimeoutCount++;
      const elapsed = Date.now() - this.lastHeartbeatAt;

      if (this.heartbeatTimeoutCount >= HEARTBEAT_TIMEOUT_THRESHOLD) {
        logger.warn(
          `[qqbot-ws] 心跳超时 ${this.heartbeatTimeoutCount} 次 (${elapsed}ms)，触发重连`
        );
        this.heartbeatTimeoutCount = 0;
        this._closeCurrentWs();
        this._scheduleReconnect();
        return;
      }

      logger.warn(
        `[qqbot-ws] 心跳超时 (${elapsed}ms), ${this.heartbeatTimeoutCount}/${HEARTBEAT_TIMEOUT_THRESHOLD}`
      );
      // 继续等待下一次检测
      this.heartbeatTimer = setTimeout(() => {
        this._sendHeartbeat();
      }, this.heartbeatIntervalMs);
      return;
    }

    const heartbeatPayload = {
      op: 1, // Heartbeat
      d: this.lastSequenceNumber != null ? this.lastSequenceNumber : null,
    };

    try {
      this.heartbeatAckReceived = false;
      this.lastHeartbeatAt = Date.now();
      this._sendRaw(heartbeatPayload);
      logger.debug(`[qqbot-ws] 心跳已发送: seq=${this.lastSequenceNumber}`);
    } catch (err) {
      logger.error(`[qqbot-ws] 心跳发送失败: ${err.message}`);
    }
  }

  _onHeartbeatAck() {
    this.heartbeatAckReceived = true;
    this.heartbeatTimeoutCount = 0;

    const latency = Date.now() - this.lastHeartbeatAt;
    logger.debug(`[qqbot-ws] 心跳 ACK: 延迟=${latency}ms`);

    // 安排下一次心跳
    this._startHeartbeat(false);
  }

  // ── 网关地址获取 ──────────────────────────────────────────────────

  /**
   * 通过 REST API 获取 WebSocket 网关地址
   */
  async _fetchGateway() {
    try {
      let token;
      try {
        token = await QqbotClient.tokenManager.getAccessToken(this.appId, this.clientSecret);
      } catch (e) {
        throw new Error(`获取 Token 失败: ${e.message}`);
      }

      const client = new QqbotClient({ appId: this.appId, clientSecret: this.clientSecret, proxyUrl: this.proxyUrl });

      const baseUrl = process.env.QQBOT_API_BASE_URL || 'https://api.sgroup.qq.com';
      const axiosInstance = client.getAxiosInstance();

      const response = await axiosInstance.get(`${baseUrl}/gateway/bot`, {
        headers: { Authorization: `QQBot ${token}` },
      });

      const data = response.data;
      if (data && data.url) {
        return {
          url: data.url,
          resume_url: data.resume_gateway_url || null,
          shards: data.shards || [0, 1],
          session_start_limit: data.session_start_limit || null,
        };
      }

      return null;
    } catch (err) {
      logger.debug(`[qqbot-ws] 获取网关地址失败（将使用默认地址）: ${err.message}`);
      return null;
    }
  }

  // ── Token 刷新 ────────────────────────────────────────────────────

  _invalidateTokenAndReconnect() {
    try {
      QqbotClient.tokenManager.invalidate(this.appId);
    } catch {
      // ignore
    }
    this._closeCurrentWs();
    this._scheduleReconnect();
  }

  // ── 发送原始数据 ──────────────────────────────────────────────────

  _sendRaw(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error(`[qqbot-ws] 发送失败: WS 未就绪 (readyState=${this.ws?.readyState})`);
      return false;
    }
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  // ── 重连逻辑 ──────────────────────────────────────────────────────

  _getReconnectDelay() {
    const index = Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1);
    return RECONNECT_DELAYS[index];
  }

  _scheduleReconnect(customDelay) {
    if (this.disposed) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(`[qqbot-ws] 达到最大重连次数 (${MAX_RECONNECT_ATTEMPTS}), 放弃`);
      this._setState('disconnected');
      this.onError?.(new Error(`最大重连次数超限 (${MAX_RECONNECT_ATTEMPTS})`));
      return;
    }

    // 如果有 sessionId 且未过期，尝试 Resume；否则完整重连
    const canResume = !!this.sessionId && this.reconnectAttempts < 3;
    
    const delay = customDelay || this._getReconnectDelay();
    this.reconnectAttempts++;
    
    if (canResume) {
      this._setState('reconnecting'); // 将尝试 Resume
      logger.info(
        `[qqbot-ws] ${delay}ms 后尝试 Resume (第 ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} 次)`
      );
    } else {
      this._setState('reconnecting');
      logger.info(
        `[qqbot-ws] ${delay}ms 后重新连接 (第 ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} 次)`
      );
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.disposed) {
        if (canResume && this.ws?.readyState !== WebSocket.OPEN) {
          // 尝试 Resume 流程
          this._doConnect(); // 重新建立 WS 连接，然后在 open 时发送 Resume
          // 注意：实际上 Resume 需要在新的 WS 连接上发送，所以还是走 _doConnect -> _sendResume
          // 但简化处理：直接重新走完整流程更稳定
        }
        // 直接重新连接
        this._doConnect();
      }
    }, delay);
  }

  _setState(next) {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    logger.debug(`[qqbot-ws] 状态变化: ${prev} → ${next}`);
    this.onStateChange?.(next);
  }

  _closeCurrentWs() {
    this._stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.on('error', () => {}); // 防止 unhandled error
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(4000, 'client reconnecting');
        }
      } catch { /* ignore */ }
      this.ws = null;
    }
  }

  _cleanup() {
    this._closeCurrentWs();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._setState('disconnected');
  }
}

module.exports = QqbotWsClient;
