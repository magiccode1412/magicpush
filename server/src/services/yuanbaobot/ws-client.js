const WebSocket = require('ws');
const { randomUUID } = require('crypto');
const protoCodec = require('./proto-codec');
const { getTokenManager } = require('./auth');
const logger = require('../../utils/logger');

// ── 常量 ──────────────────────────────────────────────────────────────
const DEFAULT_WS_GATEWAY_URL = 'wss://bot-wss.yuanbao.tencent.com/wss/connection';
const DEFAULT_HEARTBEAT_INTERVAL_S = 5;
const SEND_TIMEOUT_MS = 30_000;
const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000, 60_000];
const MAX_RECONNECT_ATTEMPTS = 50;
const HEARTBEAT_TIMEOUT_THRESHOLD = 2;

// 不重连的错误码
const NO_RECONNECT_CODES = new Set([4012, 4013, 4014, 4018, 4019, 4021]);
// 触发 token 刷新的错误码
const AUTH_FAILED_CODES = new Set([41103, 41104, 41108]);
// 可重试的瞬时错误码
const RETRYABLE_CODES = new Set([50400, 50503]);

// ── 工具函数 ──────────────────────────────────────────────────────────
function generateMsgId() {
  return randomUUID().replace(/-/g, '');
}

function getOS() {
  const platform = process.platform;
  switch (platform) {
    case 'darwin': return 'Darwin';
    case 'win32': return 'Windows_NT';
    default: return 'Linux';
  }
}

// ── yuabaobotWsClient ────────────────────────────────────────────────────

/**
 * 元宝 WebSocket 客户端
 *
 * 功能：
 *  - 建立 WS 长连接
 *  - 自动认证 (AuthBind)
 *  - 心跳保活 (Ping/Pong)
 *  - 发送 C2C 文本消息
 *  - 接收入站消息推送 (用于握手绑定)
 *  - 断线自动重连 + Token 刷新
 */
class yuabaobotWsClient {
  /**
   * @param {Object} config
   * @param {string} config.appKey
   * @param {string} config.appSecret
   * @param {string} [config.apiDomain]
   * @param {string} [config.wsUrl]
   */
  constructor(config) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.apiDomain = config.apiDomain || undefined;
    this.wsUrl = config.wsUrl || DEFAULT_WS_GATEWAY_URL;

    // Token 管理
    this.tokenManager = getTokenManager(this.appKey, this.appSecret, this.apiDomain);

    // 连接状态
    this.state = 'disconnected'; // disconnected | connecting | authenticating | connected | reconnecting
    this.ws = null;
    this.connectId = null;
    this.botId = null; // 认证成功后保存 Bot 自身 ID，发送消息时作为 fromAccount

    // 心跳
    this.heartbeatIntervalS = DEFAULT_HEARTBEAT_INTERVAL_S;
    this.heartbeatTimer = null;
    this.heartbeatAckReceived = true;
    this.lastHeartbeatAt = 0;
    this.heartbeatTimeoutCount = 0;

    // 重连
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.disposed = false;

    // 待响应的请求映射 (msgId -> {resolve, reject, timer})
    this.pendingRequests = new Map();

    // 回调
    this.onReady = null;       // () => void           认证成功回调
    this.onError = null;       // (Error) => void       错误回调
    this.onDispatch = null;    // (event) => void       入站消息回调
    this.onStateChange = null; // (state) => void       状态变化回调
    this.onKickout = null;     // (info) => void        被踢下线回调
  }

  // ── 公开方法 ──────────────────────────────────────────────────────

  connect() {
    if (this.disposed) {
      throw new Error('Client has been disposed');
    }
    logger.info(`[yuanbaobot-ws] 开始连接: url=${this.wsUrl}, appKey=${this.appKey}`);
    this._doConnect();
  }

  disconnect() {
    logger.info(`[yuanbaobot-ws] 主动断开连接: appKey=${this.appKey}`);
    this.disposed = true;
    this._cleanup();
  }

  getState() {
    return this.state;
  }

  /**
   * 发送文本消息到指定用户 (C2C)
   * @param {string} toAccount - 目标用户 ID
   * @param {string} text - 消息文本 (最大 3000 字符)
   * @returns {Promise<{code: number, message?: string}>}
   */
  async sendText(toAccount, text) {
    if (!toAccount) {
      throw new Error('sendText: toAccount 不能为空');
    }
    if (!text) {
      throw new Error('sendText: text 不能为空');
    }

    if (!this.botId) {
      throw new Error('sendText: Bot 身份未知（未完成认证）');
    }

    // 截断超长消息
    if (text.length > 3000) {
      logger.warn(`[yuanbaobot-ws] 消息截断: 原始长度=${text.length}, 最大3000`);
      text = text.substring(0, 3000);
    }

    if (this.state !== 'connected') {
      throw new Error(`WS 未就绪 (state=${this.state})，无法发送消息`);
    }

    const msgId = generateMsgId();
    logger.info(`[yuanbaobot-ws][C2C] 准备发送消息: msgId=${msgId}, to=${toAccount}, len=${text.length}`);

    const encoded = protoCodec.encodeSendC2CMessageReq({ msgId, toAccount, fromAccount: this.botId, text });
    return this._sendAndWait(
      protoCodec.BIZ_CMD.SendC2CMessage,
      protoCodec.BIZ_MODULE,
      encoded,
      msgId,
    );
  }

  /**
   * 发送群聊文本消息
   * @param {string} groupCode - 群号（来自入站消息的 groupId / groupCode）
   * @param {string} text - 消息文本
   */
  async sendGroupText(groupCode, text) {
    if (!groupCode) {
      throw new Error('sendGroupText: groupCode 不能为空');
    }
    if (!text) {
      throw new Error('sendGroupText: text 不能为空');
    }
    if (!this.botId) {
      throw new Error('sendGroupText: Bot 身份未知（未完成认证）');
    }

    if (text.length > 3000) {
      logger.warn(`[yuanbaobot-ws][GROUP] 消息截断: 原始长度=${text.length}, 最大3000`);
      text = text.substring(0, 3000);
    }

    if (this.state !== 'connected') {
      throw new Error(`WS 未就绪 (state=${this.state})，无法发送群消息`);
    }

    const msgId = generateMsgId();
    logger.info(`[yuanbaobot-ws][GROUP] 准备发送群消息: msgId=${msgId}, groupCode=${groupCode}, len=${text.length}`);

    const encoded = protoCodec.encodeSendGroupMessageReq({ msgId, groupCode, fromAccount: this.botId, text });
    return this._sendAndWait(
      protoCodec.BIZ_CMD.SendGroupMessage,
      protoCodec.BIZ_MODULE,
      encoded,
      msgId,
    );
  }

  // ── 私有方法：连接生命周期 ─────────────────────────────────────────

  async _doConnect() {
    if (this.disposed) return;
    this._setState('connecting');

    // 1. 先获取签名 token
    let tokenData;
    try {
      tokenData = await this.tokenManager.getToken();
    } catch (err) {
      logger.error(`[yuanbaobot-ws] 获取 token 失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
      return;
    }

    if (this.disposed) return;

    // 2. 建立 WebSocket 连接
    logger.info(`[yuanbaobot-ws] 正在建立 WS 连接: ${this.wsUrl}, uid=${tokenData.botId}`);

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (err) {
      logger.error(`[yuanbaobot-ws] 创建 WebSocket 实例失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      logger.info(`[yuanbaobot-ws] WS 已连接, 开始发送 AuthBind...`);
      this._sendAuthBind(tokenData);
    });

    this.ws.on('message', (raw) => {
      this._onMessage(raw);
    });

    this.ws.on('close', (code, reason) => {
      const reasonStr = Buffer.isBuffer(reason) ? reason.toString('utf-8') : String(reason || '');
      logger.info(`[yuanbaobot-ws] WS 关闭: code=${code}, reason=${reasonStr}`);
      this._stopHeartbeat();
      this.onError?.(new Error(`WS closed: code=${code}, reason=${reasonStr}`));

      if (!this.disposed) {
        if (NO_RECONNECT_CODES.has(code)) {
          logger.warn(`[yuanbaobot-ws] 收到不可恢复错误码 ${code}, 不再重连`);
          this._setState('disconnected');
        } else {
          this._scheduleReconnect();
        }
      }
    });

    this.ws.on('error', (err) => {
      logger.error(`[yuanbaobot-ws] WS 错误: ${err.message}`);
      this.onError?.(err);
    });
  }

  _sendAuthBind(tokenData) {
    this._setState('authenticating');
    const msgId = generateMsgId();

    // 保存 Bot 身份 ID，后续发送消息时作为 fromAccount
    this.botId = tokenData.botId;

    const payload = {
      bizId: 'ybBot',
      authInfo: {
        uid: tokenData.botId,
        source: tokenData.source,
        token: tokenData.token,
      },
      deviceInfo: {
        appVersion: 'magicpush-1.0.0',
        appOperationSystem: getOS(),
        instanceId: String(16),
        botVersion: 'magicpush-1.0.0',
      },
      msgId,
    };

    logger.info(`[yuanbaobot-ws] 发送 AuthBind: bizId=ybBot, uid=${payload.authInfo.uid}`);

    try {
      const binary = protoCodec.buildAuthBindMsg(payload);
      this._sendRaw(binary);
    } catch (err) {
      logger.error(`[yuanbaobot-ws] AuthBind 编码失败: ${err.message}`);
      this.onError?.(err);
      this._scheduleReconnect();
    }
  }

  _onMessage(raw) {
    let binary;
    if (Buffer.isBuffer(raw)) {
      binary = new Uint8Array(raw);
    } else if (raw instanceof ArrayBuffer) {
      binary = new Uint8Array(raw);
    } else if (Array.isArray(raw)) {
      binary = Uint8Array.from(Buffer.concat(raw));
    } else {
      logger.warn('[yuanbaobot-ws] 收到非二进制消息，忽略');
      return;
    }

    let connMsg;
    try {
      connMsg = protoCodec.decodeConnMsg(binary);
    } catch (err) {
      logger.error(`[yuanbaobot-ws] 解码 ConnMsg 失败: ${err.message}`);
      return;
    }

    if (!connMsg?.head) {
      logger.warn('[yuanbaobot-ws] 解码后无 head，忽略');
      return;
    }

    const { head } = connMsg;
    logger.debug(`[yuanbaobot-ws] 收到消息: cmd=${head.cmd}, cmdType=${head.cmdType}, status=${head.status}, msgId=${head.msgId}`);

    // cmdType=1: 响应
    if (head.cmdType === protoCodec.CMD_TYPE.Response) {
      this._onResponse(connMsg);
      return;
    }

    // cmdType=2: 下行推送
    if (head.cmdType === protoCodec.CMD_TYPE.Push) {
      this._onPush(connMsg);
      return;
    }

    logger.debug(`[yuanbaobot-ws] 未处理的 cmdType=${head.cmdType}, cmd=${head.cmd}`);
  }

  _onResponse(connMsg) {
    const { head, data } = connMsg;
    const { cmd } = head;

    // AuthBind 响应
    if (cmd === protoCodec.CMD.AuthBind) {
      this._onAuthBindResponse(head, data);
      return;
    }

    // Ping 响应
    if (cmd === protoCodec.CMD.Ping) {
      this._onPingResponse(head, data);
      return;
    }

    // 业务响应 — 通过 msgId 匹配 pending request
    this._onBusinessResponse(head, data);
  }

  _onAuthBindResponse(head, data) {
    const rsp = protoCodec.decodePB(protoCodec.PB_MSG_TYPES.AuthBindRsp, data);
    logger.info(`[yuanbaobot-ws] AuthBind 响应: head.status=${head.status}, rsp.code=${rsp?.code}, msg=${rsp?.message}`);

    // 已认证视为成功
    const isAlreadyAuth = rsp?.code === 41101;

    if (head.status && head.status !== 0 && !isAlreadyAuth) {
      this._handleAuthFailure(head, rsp, 'head-status');
      return;
    }

    if (!rsp || (rsp.code !== 0 && !isAlreadyAuth)) {
      this._handleAuthFailure(head, rsp, 'rsp-code');
      return;
    }

    // 认证成功！
    this.connectId = rsp.connectId || null;
    this.reconnectAttempts = 0;
    this._setState('connected');

    logger.info(`[yuanbaobot-ws] ✅ 认证成功! connectId=${this.connectId}, ip=${rsp.clientIp}`);

    this._startHeartbeat(true);
    this.onReady?.({
      connectId: this.connectId || '',
      timestamp: Number(rsp.timestamp || 0),
      clientIp: rsp.clientIp || '',
    });
  }

  _handleAuthFailure(head, rsp, source) {
    const code = rsp?.code || head.status;

    if (AUTH_FAILED_CODES.has(code)) {
      logger.warn(`[yuanbaobot-ws] [${source}] token 无效 (code=${code}), 尝试刷新后重连`);
      this._closeCurrentWs();
      this.tokenManager.invalidateCache();
      this._scheduleReconnect();
      return;
    }

    if (RETRYABLE_CODES.has(code)) {
      logger.warn(`[yuanbaobot-ws] [${source}] 可重试错误 (code=${code}), 重连中`);
      this._closeCurrentWs();
      this._scheduleReconnect();
      return;
    }

    // 不可恢复
    logger.error(`[yuanbaobot-ws] [${source}] 认证失败: code=${code}, msg=${rsp?.message}`);
    this._closeCurrentWs();
    this._setState('disconnected');
    this.onError?.(new Error(`AuthBind 失败: code=${code}`));
  }

  _onPingResponse(head, data) {
    this.heartbeatAckReceived = true;
    this.heartbeatTimeoutCount = 0;

    const latency = Date.now() - this.lastHeartbeatAt;
    const rsp = protoCodec.decodePB(protoCodec.PB_MSG_TYPES.PingRsp, data);
    const interval = rsp?.heartInterval;
    if (interval && interval > 1) {
      this.heartbeatIntervalS = interval;
    }

    logger.debug(`[yuanbaobot-ws] 心跳 ACK: 延迟=${latency}ms${interval ? `, 新间隔=${interval}s` : ''}`);
    this._startHeartbeat(false);
  }

  _onPush(connMsg) {
    const { head, data } = connMsg;
    logger.info(`[yuanbaobot-ws] 收到下行推送: cmd=${head.cmd}, needAck=${!!head.needAck}`);

    // 发送 ACK（如果需要）
    if (head.needAck) {
      // TODO: 实现 buildPushAck
    }

    // Kickout
    if (head.cmd === protoCodec.CMD.Kickout) {
      const kickout = protoCodec.decodePB(protoCodec.PB_MSG_TYPES.KickoutMsg, data);
      logger.warn(`[yuanbaobot-ws] 被踢下线: status=${kickout?.status}, reason=${kickout?.reason}`);
      this.onKickout?.({ status: kickout?.status || 0, reason: kickout?.reason || '' });
      return;
    }

    // 入站消息推送 —— 核心功能！用于握手绑定 / 群聊消息接收
    if (head.cmd === 'inbound_message') {
      const inbound = protoCodec.decodeInboundMessagePush(data);
      if (inbound) {
        logger.info(`[yuanbaobot-ws] 📩 收到入站消息: from=${inbound.fromAccount}, to=${inbound.toAccount}, nick=${inbound.senderNickname}, cmd=${inbound.callbackCommand}, groupCode=${inbound.groupCode || '(私聊)'}`);
        this.onDispatch?.({
          type: 'inbound_message',
          fromAccount: inbound.fromAccount,
          toAccount: inbound.toAccount,
          senderNickname: inbound.senderNickname,
          clawMsgType: inbound.clawMsgType,
          msgBody: inbound.msgBody || [],
          groupId: inbound.groupId,
          groupCode: inbound.groupCode,
          callbackCommand: inbound.callbackCommand,
          rawData: inbound,
        });
      }
      return;
    }

    // 其他推送原样传递
    logger.debug(`[yuanbaobot-ws] 其他推送: cmd=${head.cmd}`);
    this.onDispatch?.({ type: 'unknown_push', cmd: head.cmd, rawData: data });
  }

  _onBusinessResponse(head, data) {
    const { msgId } = head;
    if (!msgId) return;

    const pending = this.pendingRequests.get(msgId);
    if (!pending) {
      logger.debug(`[yuanbaobot-ws] 收到无匹配的响应: msgId=${msgId}`);
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(msgId);

    // 尝试 Protobuf 解码
    let decoded;
    if (data && data.length > 0) {
      decoded = protoCodec.decodeSendMessageRsp(data);
    }

    if (decoded) {
      if (head.status && head.status !== 0) {
        decoded.code = head.status;
        decoded.message = decoded.message || 'FAIL';
      }
      logger.debug(`[yuanbaobot-ws] 业务响应解码: msgId=${msgId}, code=${decoded.code}`);
      pending.resolve(decoded);
    } else {
      // 解码失败，基于 head 返回基础响应
      pending.resolve({
        msgId,
        code: head.status || 0,
        message: head.status === 0 ? '' : 'DECODE_FAIL',
      });
    }
  }

  // ── 心跳 ──────────────────────────────────────────────────────────

  _startHeartbeat(isFirst = false) {
    this._stopHeartbeat();
    this.heartbeatAckReceived = true;
    if (isFirst) this.heartbeatTimeoutCount = 0;

    const delayMs = isFirst ? 5000 : (this.heartbeatIntervalS - 1) * 1000;
    logger.debug(`[yuanbaobot-ws] 心跳定时: ${delayMs}ms 后`);

    this.heartbeatTimer = setTimeout(() => {
      this._sendPing();
    }, delayMs);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _sendPing() {
    // 上次心跳未收到 ACK
    if (!this.heartbeatAckReceived) {
      this.heartbeatTimeoutCount++;
      const elapsed = Date.now() - this.lastHeartbeatAt;

      if (this.heartbeatTimeoutCount >= HEARTBEAT_TIMEOUT_THRESHOLD) {
        logger.warn(`[yuanbaobot-ws] 心跳超时 ${this.heartbeatTimeoutCount} 次连续 (${elapsed}ms), 触发重连`);
        this.heartbeatTimeoutCount = 0;
        this._closeCurrentWs();
        this._scheduleReconnect();
        return;
      }

      logger.warn(`[yuanbaobot-ws] 心跳超时 (${elapsed}ms), ${this.heartbeatTimeoutCount}/${HEARTBEAT_TIMEOUT_THRESHOLD}`);
      // 只安排下一次检测，不重置 ack
      const delayMs = (this.heartbeatIntervalS - 1) * 1000;
      this.heartbeatTimer = setTimeout(() => { this._sendPing(); }, delayMs);
      return;
    }

    const msgId = generateMsgId();
    try {
      const binary = protoCodec.buildPingMsg(msgId);
      this.heartbeatAckReceived = false;
      this.lastHeartbeatAt = Date.now();
      this._sendRaw(binary);
      logger.debug(`[yuanbaobot-ws] 心跳已发送: msgId=${msgId}`);
    } catch (err) {
      logger.error(`[yuanbaobot-ws] 心跳编码失败: ${err.message}`);
    }
  }

  // ── 发送与请求-响应匹配 ────────────────────────────────────────────

  _sendRaw(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error(`[yuanbaobot-ws] 发送失败: WS 未就绪 (readyState=${this.ws?.readyState})`);
      return false;
    }
    this.ws.send(Buffer.from(data));
    return true;
  }

  /**
   * 发送业务请求并等待响应
   */
  _sendAndWait(cmd, module, encodedData, msgId) {
    const binary = protoCodec.buildBusinessConnMsg(cmd, module, encodedData, msgId);
    if (!binary) {
      return Promise.reject(new Error('构建业务消息失败'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(msgId);
        reject(new Error(`WS 请求超时 (${SEND_TIMEOUT_MS}ms), msgId=${msgId}`));
      }, SEND_TIMEOUT_MS);

      this.pendingRequests.set(msgId, { resolve, reject, timer });

      const sent = this._sendRaw(binary);
      if (!sent) {
        clearTimeout(timer);
        this.pendingRequests.delete(msgId);
        reject(new Error('WebSocket 未连接'));
      }
    });
  }

  // ── 重连逻辑 ──────────────────────────────────────────────────────

  _getReconnectDelay() {
    const index = Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1);
    return RECONNECT_DELAYS[index];
  }

  _scheduleReconnect(customDelay) {
    if (this.disposed) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(`[yuanbaobot-ws] 达到最大重连次数 (${MAX_RECONNECT_ATTEMPTS}), 放弃`);
      this._setState('disconnected');
      this.onError?.(new Error(`最大重连次数超限 (${MAX_RECONNECT_ATTEMPTS})`));
      return;
    }

    const delay = customDelay || this._getReconnectDelay();
    this.reconnectAttempts++;
    this._setState('reconnecting');

    logger.info(`[yuanbaobot-ws] ${delay}ms 后重连 (第 ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} 次)`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.disposed) {
        this._doConnect();
      }
    }, delay);
  }

  _setState(next) {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    logger.debug(`[yuanbaobot-ws] 状态变化: ${prev} → ${next}`);
    this.onStateChange?.(next);
  }

  _closeCurrentWs() {
    this._stopHeartbeat();
    if (this.ws) {
      try {
        // 防止 removeAllListeners 后 unhandled error
        this.ws.on('error', () => {});
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, 'client closing');
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
    for (const [msgId, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.resolve({ msgId, code: -1, message: 'Client disposed' });
    }
    this.pendingRequests.clear();
    this._setState('disconnected');
  }
}

// ── 业务命令常量（与 proto-codec.js 保持一致） ───────────────────────
yuabaobotWsClient.BIZ_CMD = {
  SendC2CMessage: 'send_c2c_message',
};

module.exports = yuabaobotWsClient;