const { ChannelModel } = require('../../models');
const QqbotWsClient = require('./ws-client');
const logger = require('../../utils/logger');

/**
 * QQ Bot WS 连接监控服务
 *
 * 职责：
 *  1. 为每个已配置的 qqbot 渠道维护一个 WS 连接（按 appId 复用）
 *  2. 接收入站消息，提取 OpenID 完成握手绑定
 *  3. 管理连接生命周期（启动/停止/重连）
 */
class QqbotMonitor {
  constructor() {
    /** @type {Map<string, QqbotWsClient>} appId -> WS 客户端实例 */
    this.clientMap = new Map();

    /**
     * appId -> Set<channelId> 映射
     * 记录每个 appId 下有哪些活跃渠道，用于 onDispatch 回调时正确路由到对应渠道
     * @type {Map<string, Set<string>>}
     */
    this.appChannelMap = new Map();

    /** @type {Set<string>} 已获取到 targetId 的 channelId 集合 */
    this.boundSet = new Set();

    this.started = false;
  }

  /**
   * 启动监控：为所有激活的 qqbot 渠道建立连接
   */
  start() {
    if (this.started) return;
    this.started = true;

    const channels = this._getActiveChannels();
    for (const ch of channels) {
      this._ensureConnection(ch);
    }

    logger.info(`[qqbot-monitor] 监控服务已启动, 共 ${channels.length} 个渠道`);
  }

  stop() {
    if (!this.started) return;
    this.started = false;

    for (const [appId, client] of this.clientMap) {
      try { client.disconnect(); } catch { /* ignore */ }
      logger.info(`[qqbot-monitor] 已断开 appId=${appId}`);
    }
    this.clientMap.clear();
    this.appChannelMap.clear();
    this.boundSet.clear();
    logger.info('[qqbot-monitor] 监控服务已停止');
  }

  /**
   * 新增渠道时调用
   * @param {number|string} channelId
   */
  addChannel(channelId) {
    const channel = ChannelModel.findById(channelId);
    if (!channel || channel.channel_type !== 'qqbot' || !channel.is_active) return;

    const config = typeof channel.config === 'string'
      ? JSON.parse(channel.config)
      : channel.config;

    // 记录 appId -> channelId 的映射
    const { appId } = config;
    if (!appId) return;

    if (!this.appChannelMap.has(appId)) {
      this.appChannelMap.set(appId, new Set());
    }
    this.appChannelMap.get(appId).add(String(channelId));

    logger.info(`[qqbot-monitor] 注册渠道 ${channelId} → appId=${appId}, 当前该 appId 下共 ${this.appChannelMap.get(appId).size} 个渠道`);

    // 建立或复用 WS 连接
    this._ensureConnection({ id: channel.id, ...channel, config });

    // 清除旧的绑定标记（重新走握手流程）
    this.boundSet.delete(String(channelId));
  }

  /**
   * 删除渠道时调用
   */
  removeChannel(channelId) {
    this.boundSet.delete(String(channelId));

    // 从 appChannelMap 中移除
    for (const [appId, channelIds] of this.appChannelMap.entries()) {
      channelIds.delete(String(channelId));
      if (channelIds.size === 0) {
        this.appChannelMap.delete(appId);
        // 没有渠道使用这个 appId 了，断开连接
        const client = this.clientMap.get(appId);
        if (client) {
          try { client.disconnect(); } catch { /* ignore */ }
          this.clientMap.delete(appId);
          logger.info(`[qqbot-monitor] appId=${appId} 无引用, 已断开`);
        }
      }
    }
  }

  /**
   * 指定渠道是否已完成握手绑定（有 targetId）
   */
  isBound(channelId) {
    return this.boundSet.has(String(channelId));
  }

  /**
   * 获取指定渠道的 WS Client（供外部查询状态用）
   * @param {string} appId
   * @returns {QqbotWsClient|undefined}
   */
  getClient(appId) {
    return this.clientMap.get(appId);
  }

  // ── 私有方法 ──────────────────────────────────────────────────────

  _getActiveChannels() {
    try {
      const db = require('../../config/database');
      const stmt = db.prepare(
        "SELECT * FROM channels WHERE channel_type = 'qqbot' AND is_active = 1"
      );
      const rows = stmt.all();
      return rows.map(ch => ({
        ...ch,
        config: typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config,
      }));
    } catch (err) {
      logger.error('[qqbot-monitor] 获取渠道列表失败:', err.message);
      return [];
    }
  }

  _ensureConnection(channel) {
    const { id: channelId, config } = channel;
    const { appId, token: clientSecret, proxyUrl } = config;

    if (!appId || !clientSecret) {
      logger.warn(`[qqbot-monitor] 渠道 ${channelId} 缺少 appId/clientSecret, 跳过`);
      return;
    }

    // 检查是否已有该 appId 的连接
    const existingClient = this.clientMap.get(appId);
    if (existingClient) {
      const state = existingClient.getState();
      // 连接存活且正常 → 直接复用
      if (state === 'connected') {
        logger.info(`[qqbot-monitor] appId=${appId} 已有活跃连接(state=connected), 复用于渠道 ${channelId}`);
        return;
      }

      // 连接已断开或异常 → 清理后重建
      logger.warn(
        `[qqbot-monitor] appId=${appId} 已有连接但状态异常(${state}), 将清理并重建 (触发渠道 ${channelId})`
      );
      try { existingClient.disconnect(); } catch { /* ignore */ }
      this.clientMap.delete(appId);
    }

    logger.info(`[qqbot-monitor] 为 appId=${appId} 创建新 WS 连接 (渠道 ${channelId})`);

    const client = new QqbotWsClient({
      appId,
      clientSecret,
      proxyUrl,
    });

    // 注册回调 —— 使用闭包捕获 appId 而非 channelId，通过 appChannelMap 动态路由
    const monitor = this;

    client.onReady = (info) => {
      const channels = monitor.appChannelMap.get(appId);
      const ids = channels ? Array.from(channels).join(', ') : 'unknown';
      logger.info(
        `[qqbot-monitor] ✅ appId=${appId} WS 就绪 (渠道 ${ids}): sessionId=${info.sessionId}, botId=${info.botId}, botName=${info.botUsername}`
      );
    };

    client.onError = (err) => {
      logger.warn(`[qqbot-monitor] appId=${appId} WS 错误: ${err.message}`);
    };

    client.onDispatch = (event) => {
      // 从 appChannelMap 获取该 appId 下所有未绑定的渠道，逐一处理
      const channelIds = monitor.appChannelMap.get(appId);
      if (!channelIds || channelIds.size === 0) {
        logger.warn(`[qqbot-monitor] appId=${appId} 收到事件但无活跃渠道`);
        return;
      }

      // 优先处理未绑定的渠道（最新的优先）
      const unboundIds = [...channelIds].filter(id => !monitor.boundSet.has(id));
      const targetIds = unboundIds.length > 0 ? unboundIds : [...channelIds];

      for (const cid of targetIds) {
        monitor._handleInboundEvent(cid, event);
        // 如果已经成功提取到 OpenID，处理第一个即可
        if (monitor.boundSet.has(cid)) break;
      }
    };

    client.onStateChange = (state) => {
      logger.debug(`[qqbot-monitor] appId=${appId} WS 状态 → ${state}`);
    };

    this.clientMap.set(appId, client);

    // 启动连接
    try {
      client.connect();
    } catch (err) {
      logger.error(`[qqbot-monitor] appId=${appId} 启动连接失败: ${err.message}`);
    }
  }

  /**
   * 处理入站事件 —— 核心：从消息事件中提取 OpenID 并保存
   */
  async _handleInboundEvent(channelId, event) {
    let extractedData = null;

    switch (event.type) {
      case 'c2c_message':
        // 单聊：提取 userOpenid 作为 targetId（用于 C2C 场景）
        if (event.userOpenid) {
          extractedData = {
            targetType: 'c2c',
            targetId: event.userOpenid,
            msgType: 'c2c',
          };
          logger.info(
            `[qqbot-monitor] 🎉 渠道 ${channelId} 提取到 C2C OpenID: user_openid=${event.userOpenid}`
          );
        }
        break;

      case 'group_at_message':
      case 'group_message':
        // 群聊：优先提取 groupOpenid 作为 targetId（群聊场景更常用）
        if (event.groupOpenid) {
          extractedData = {
            targetType: 'group',
            targetId: event.groupOpenid,
            msgType: 'group',
            memberOpenid: event.memberOpenid || null,
          };
          logger.info(
            `[qqbot-monitor] 🎉 渠道 ${channelId} 提取到群 OpenID: group_openid=${event.groupOpenid}`
          );
        }
        break;

      case 'at_channel_message':
      case 'channel_message':
        // 频道子频道：使用 channelId + guildId
        if (event.channelId && event.guildId) {
          extractedData = {
            targetType: 'channel',
            targetId: event.channelId,
            msgType: 'channel',
            guildId: event.guildId,
            userId: event.userId || null,
          };
          logger.info(
            `[qqbot-monitor] 🎉 渠道 ${channelId} 提取到频道 ID: channel_id=${event.channelId}`
          );
        }
        break;

      case 'direct_message':
        // 频道私信：使用 userId
        if (event.userId && event.guildId) {
          extractedData = {
            targetType: 'dms',
            targetId: event.userId,
            msgType: 'dms',
            guildId: event.guildId,
          };
          logger.info(
            `[qqbot-monitor] 🎉 渠道 ${channelId} 提取到私信用户 ID: user_id=${event.userId}`
          );
        }
        break;

      default:
        logger.debug(`[qqbot-monitor] 忽略非消息事件: type=${event.type}`);
        return;
    }

    if (!extractedData) {
      logger.warn(`[qqbot-monitor] 收到消息事件但无法提取目标 ID! event=`, JSON.stringify(event).substring(0, 300));
      return;
    }

    // 持久化到数据库
    try {
      const channel = ChannelModel.findById(channelId);
      if (!channel) {
        logger.warn(`[qqbot-monitor] 渠道 ${channelId} 不存在`);
        return;
      }

      const config = typeof channel.config === 'string'
        ? JSON.parse(channel.config)
        : channel.config;

      let changed = false;

      // 更新 targetId（核心字段）
      if (config.targetId !== extractedData.targetId) {
        config.targetId = extractedData.targetId;
        changed = true;
      }

      // 如果用户在配置中选择的场景与事件类型不匹配，自动调整 msgType
      // 这样可以确保 send() 方法使用正确的 API 端点
      if (config.msgType !== extractedData.msgType) {
        config.msgType = extractedData.msgType;
        changed = true;
        logger.info(
          `[qqbot-monitor] 自动调整推送场景: ${config.msgType || '(未设置)'} → ${extractedData.msgType}`
        );
      }

      // 保存额外信息
      if (extractedData.memberOpenid && config.memberOpenid !== extractedData.memberOpenid) {
        config.memberOpenid = extractedData.memberOpenid;
        changed = true;
      }
      if (extractedData.guildId && config.sourceGuildId !== extractedData.guildId) {
        config.sourceGuildId = extractedData.guildId;
        changed = true;
      }
      if (event.author?.username && config.senderNickname !== event.author.username) {
        config.senderNickname = event.author.username;
        changed = true;
      }

      if (changed) {
        ChannelModel.update(channelId, { config });
        logger.info(`[qqbot-monitor] ✅ 渠道 ${channelId} 配置已更新: targetId=${extractedData.targetId.substring(0, 20)}...`);
      }

      this.boundSet.add(String(channelId));

      // 方案B：单向推送模式 —— 绑定成功后检查是否可以关闭连接
      this._maybeDisconnectApp(config.appId);
    } catch (err) {
      logger.error('[qqbot-monitor] 保存入站信息失败:', err.message);
    }
  }

  /**
   * 检查指定 appId 下是否所有渠道都已绑定
   * 如果是，则断开 WS 连接释放资源（单向推送不需要常驻监听）
   * @param {string} appId
   */
  _maybeDisconnectApp(appId) {
    if (!appId) return;

    const channelIds = this.appChannelMap.get(appId);
    if (!channelIds || channelIds.size === 0) return;

    // 检查是否还有未绑定的渠道
    const hasUnbound = [...channelIds].some(id => !this.boundSet.has(id));
    if (hasUnbound) {
      logger.debug(`[qqbot-monitor] appId=${appId} 还有未绑定渠道, 保持连接`);
      return;
    }

    // 所有渠道都已绑定 → 断开连接
    const client = this.clientMap.get(appId);
    if (client) {
      try {
        client.disconnect();
        logger.info(`[qqbot-monitor] 🔌 appId=${appId} 所有渠道已绑定, 已断开 WS 连接释放资源`);
      } catch (e) {
        logger.warn(`[qqbot-monitor] 断开 appId=${appId} 连接失败: ${e.message}`);
      }
      this.clientMap.delete(appId);
    }
  }
}

// ── 单例 ──────────────────────────────────────────────────────────────
const qqbotMonitor = new QqbotMonitor();
module.exports = qqbotMonitor;
