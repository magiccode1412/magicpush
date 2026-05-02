const { ChannelModel } = require('../../models');
const yuabaobotWsClient = require('./ws-client');
const logger = require('../../utils/logger');

/**
 * 元宝 Bot WS 连接监控服务
 *
 * 职责：
 *  1. 为每个已配置的 yuanbaobot 渠道维护一个 WS 连接（单例复用）
 *  2. 接收入站消息，提取 fromAccount 完成握手绑定
 *  3. 管理连接生命周期（启动/停止/重连）
 */
class yuabaobotMonitor {
  constructor() {
    /** @type {Map<string, yuabaobotWsClient>} appKey -> client */
    this.clientMap = new Map();

    /** @type {Set<string>} 已获取到 fromAccount 的 channelId 集合 */
    this.boundSet = new Set();

    this.started = false;
  }

  /**
   * 启动监控：为所有激活的 yuanbaobot 渠道建立连接
   */
  start() {
    if (this.started) return;
    this.started = true;

    const channels = this._getActiveChannels();
    for (const ch of channels) {
      this._ensureConnection(ch);
    }

    logger.info(`[yuanbaobot-monitor] 监控服务已启动, 共 ${channels.length} 个渠道`);
  }

  stop() {
    if (!this.started) return;
    this.started = false;

    for (const [appKey, client] of this.clientMap) {
      try { client.disconnect(); } catch { /* ignore */ }
      logger.info(`[yuanbaobot-monitor] 已断开 appKey=${appKey}`);
    }
    this.clientMap.clear();
    this.boundSet.clear();
    logger.info('[yuanbaobot-monitor] 监控服务已停止');
  }

  /**
   * 新增渠道时调用
   * @param {number|string} channelId
   */
  addChannel(channelId) {
    const channel = ChannelModel.findById(channelId);
    if (!channel || channel.channel_type !== 'yuanbaobot' || !channel.is_active) return;

    const config = typeof channel.config === 'string'
      ? JSON.parse(channel.config)
      : channel.config;

    this._ensureConnection({ id: channel.id, ...channel, config });

    // 清除旧的绑定标记（重新走握手流程）
    this.boundSet.delete(String(channelId));
  }

  /**
   * 删除渠道时调用
   */
  removeChannel(channelId) {
    this.boundSet.delete(String(channelId));

    // 检查是否还有其他渠道使用同一个 appKey
    const channels = this._getActiveChannels();
    const usedKeys = new Set(channels.map(ch => ch.config.appKey).filter(Boolean));

    for (const [appKey, client] of this.clientMap) {
      if (!usedKeys.has(appKey)) {
        client.disconnect();
        this.clientMap.delete(appKey);
        logger.info(`[yuanbaobot-monitor] appKey=${appKey} 无引用, 已断开`);
      }
    }
  }

  /**
   * 指定渠道是否已完成握手绑定（有 fromAccount）
   */
  isBound(channelId) {
    return this.boundSet.has(String(channelId));
  }

  /**
   * 获取指定渠道的 WS Client（供渠道适配器发送消息用）
   * @param {string} appKey
   * @returns {yuabaobotWsClient|undefined}
   */
  getClient(appKey) {
    return this.clientMap.get(appKey);
  }

  // ── 私有方法 ──────────────────────────────────────────────────────

  _getActiveChannels() {
    try {
      const db = require('../../config/database');
      const stmt = db.prepare(
        "SELECT * FROM channels WHERE channel_type = 'yuanbaobot' AND is_active = 1"
      );
      const rows = stmt.all();
      return rows.map(ch => ({
        ...ch,
        config: typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config,
      }));
    } catch (err) {
      logger.error('[yuanbaobot-monitor] 获取渠道列表失败:', err.message);
      return [];
    }
  }

  _ensureConnection(channel) {
    const { id: channelId, config } = channel;
    const { appKey, appSecret } = config;

    if (!appKey || !appSecret) {
      logger.warn(`[yuanbaobot-monitor] 渠道 ${channelId} 缺少 appKey/appSecret, 跳过`);
      return;
    }

    // 同一 appKey 复用连接
    if (this.clientMap.has(appKey)) {
      logger.debug(`[yuanbaobot-monitor] appKey=${appKey} 已有连接, 复用`);
      return;
    }

    logger.info(`[yuanbaobot-monitor] 为渠道 ${channelId} 创建 WS 连接: appKey=${appKey}`);

    const client = new yuabaobotWsClient({
      appKey,
      appSecret,
      apiDomain: config.apiDomain || undefined,
      wsUrl: config.wsUrl || undefined,
    });

    // 注册回调
    client.onReady = (info) => {
      logger.info(`[yuanbaobot-monitor] 渠道 ${channelId} WS 就绪: connectId=${info.connectId}, ip=${info.clientIp}`);
    };

    client.onError = (err) => {
      logger.warn(`[yuanbaobot-monitor] 渠道 ${channelId} WS 错误: ${err.message}`);
    };

    client.onDispatch = (event) => {
      this._handleInboundEvent(channelId, event);
    };

    client.onStateChange = (state) => {
      logger.debug(`[yuanbaobot-monitor] 渠道 ${channelId} WS 状态 → ${state}`);
    };

    client.onKickout = (info) => {
      logger.warn(`[yuanbaobot-monitor] 渠道 ${channelId} 被踢下线: status=${info.status}, reason=${info.reason}`);
    };

    this.clientMap.set(appKey, client);

    // 启动连接
    try {
      client.connect();
    } catch (err) {
      logger.error(`[yuanbaobot-monitor] 渠道 ${channelId} 启动连接失败: ${err.message}`);
    }
  }

  /**
   * 处理入站事件 —— 核心：从 inbound_message_push 中提取 fromAccount / groupCode
   */
  async _handleInboundEvent(channelId, event) {
    if (event.type !== 'inbound_message') {
      logger.debug(`[yuanbaobot-monitor] 忽略非入站事件: type=${event.type}`);
      return;
    }

    const fromAccount = event.fromAccount;
    if (!fromAccount) {
      logger.warn(`[yuanbaobot-monitor] 收到入站消息但无 fromAccount! event=`, JSON.stringify(event).substring(0, 300));
      return;
    }

    const isGroup = event.clawMsgType === 'CLAW_MSG_GROUP' || !!event.groupCode;

    // 持久化到数据库
    try {
      const channel = ChannelModel.findById(channelId);
      if (!channel) {
        logger.warn(`[yuanbaobot-monitor] 渠道 ${channelId} 不存在`);
        return;
      }

      const config = typeof channel.config === 'string'
        ? JSON.parse(channel.config)
        : channel.config;

      let changed = false;

      // 私聊：保存 toUserId（用于握手绑定 + 私聊回复）
      if (config.toUserId !== fromAccount) {
        config.toUserId = fromAccount;
        config.senderNickname = event.senderNickname || '';
        changed = true;
        logger.info(`[yuanbaobot-monitor] 🎉 渠道 ${channelId} 握手成功! fromAccount=${fromAccount}, nick=${event.senderNickname}`);
      }

      // 群聊：保存群号
      if (isGroup && event.groupCode && config.groupCode !== event.groupCode) {
        config.groupCode = event.groupCode;
        config.groupId = event.groupId || '';
        config.groupCallbackCommand = event.callbackCommand || '';
        changed = true;
        logger.info(`[yuanbaobot-monitor] 📋 渠道 ${channelId} 收到群消息: groupCode=${event.groupCode}, groupId=${event.groupId}`);
      }

      if (changed) {
        ChannelModel.update(channelId, { config });
        logger.info(`[yuanbaobot-monitor] ✅ 渠道 ${channelId} 配置已更新`);
      }

      this.boundSet.add(String(channelId));
    } catch (err) {
      logger.error(`[yuanbaobot-monitor] 保存入站信息失败:`, err.message);
    }
  }
}

// ── 单例 ──────────────────────────────────────────────────────────────
const yuanbaobotMonitor = new yuabaobotMonitor();
module.exports = yuanbaobotMonitor;
