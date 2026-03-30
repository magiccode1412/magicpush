const { ChannelModel } = require('../../models');
const IlinkClient = require('./ilink-client');
const logger = require('../../utils/logger');

// 主动提醒阈值：距离上次用户活跃多久后主动推送提醒（毫秒）
const INACTIVE_REMIND_THRESHOLD = 23 * 3600 * 1000 + 50 * 60 * 1000;
// 定时检查间隔（毫秒）
const CHECK_INTERVAL = 600 * 1000; // 每分钟检查一次

/**
 * ClawBot context_token 长轮询监控服务
 * 通过 getUpdates 长轮询获取用户发给 Bot 的消息，提取 context_token 并持久化
 * 同时定时检测用户不活跃状态，主动推送提醒消息
 */
class ClawbotMonitor {
  constructor() {
    this.pollingMap = new Map(); // channelId -> { abort, token }
    this.remindedSet = new Set(); // 已提醒的渠道ID，避免重复发送
    this._checkTimer = null;
    this.started = false;
  }

  /**
   * 启动监控，为所有已激活的 wechatclawbot 渠道开启长轮询 + 不活跃提醒
   */
  start() {
    if (this.started) return;
    this.started = true;

    const channels = this._getActiveChannels();
    for (const channel of channels) {
      this._startPolling(channel);
    }

    // 启动定时不活跃检测
    this._checkTimer = setInterval(() => {
      this._checkInactiveChannels().catch(err => {
        logger.error('不活跃渠道检测异常:', err.message);
      });
    }, CHECK_INTERVAL);

    logger.info(`ClawBot 监控服务已启动，共 ${channels.length} 个渠道（不活跃提醒阈值: ${INACTIVE_REMIND_THRESHOLD / 60000} 分钟）`);
  }

  /**
   * 停止所有监控
   */
  stop() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    this.remindedSet.clear();
    for (const [channelId, entry] of this.pollingMap) {
      entry.abort = true;
    }
    this.pollingMap.clear();
    this.started = false;
    logger.info('ClawBot 监控服务已停止');
  }

  /**
   * 添加新渠道到监控（绑定/重新绑定时调用）
   */
  addChannel(channelId) {
    const channel = ChannelModel.findById(channelId);
    if (!channel || channel.channel_type !== 'wechatclawbot' || !channel.is_active) return;

    this._stopPolling(channelId);
    this._startPolling(channel);
  }

  /**
   * 从监控中移除渠道（删除渠道时调用）
   */
  removeChannel(channelId) {
    this._stopPolling(channelId);
  }

  /**
   * 获取数据库中所有激活的 wechatclawbot 渠道
   */
  _getActiveChannels() {
    try {
      const db = require('../../config/database');
      const stmt = db.prepare(
        "SELECT * FROM channels WHERE channel_type = 'wechatclawbot' AND is_active = 1"
      );
      return stmt.all().map(ch => ({
        ...ch,
        config: JSON.parse(ch.config),
      }));
    } catch (err) {
      logger.error('获取 wechatclawbot 渠道列表失败:', err.message);
      return [];
    }
  }

  /**
   * 停止单个渠道的轮询
   */
  _stopPolling(channelId) {
    const entry = this.pollingMap.get(channelId);
    if (entry) {
      entry.abort = true;
      this.pollingMap.delete(channelId);
      logger.info(`已停止渠道 ${channelId} 的长轮询`);
    }
  }

  /**
   * 为单个渠道启动长轮询
   */
  _startPolling(channel) {
    const { id: channelId, config } = channel;
    const { token, baseUrl } = config;

    if (!token) {
      logger.warn(`渠道 ${channelId} 缺少 token，跳过监控`);
      return;
    }

    const entry = { abort: false };
    this.pollingMap.set(channelId, entry);

    let getUpdatesBuf = '';
    const timeoutMs = 35000;

    const poll = async () => {
      while (!entry.abort) {
        try {
          const client = new IlinkClient({ baseUrl, token });
          const result = await client.getUpdates({ getUpdatesBuf });

          if (entry.abort) break;

          if (result.ret !== undefined && result.ret !== 0) {
            logger.warn(`渠道 ${channelId} getUpdates 返回 ret=${result.ret}，稍后重试`);
            await this._sleep(5000);
            continue;
          }

          if (result.get_updates_buf) {
            getUpdatesBuf = result.get_updates_buf;
          }

          if (result.longpolling_timeout_ms) {
            timeoutMs; // 可动态调整
          }

          // 处理收到的消息，提取 context_token 并重置推送计数
          if (result.msgs && result.msgs.length > 0) {
            let needResetQuota = false;
            for (const msg of result.msgs) {
              if (msg.context_token) {
                await this._saveContextToken(channelId, msg.context_token);
              }
              // 检测到用户主动发消息，标记需要重置推送额度
              needResetQuota = true;
            }
            if (needResetQuota) {
              await this._resetPushQuota(channelId);
            }
          }
        } catch (err) {
          if (entry.abort) break;
          logger.warn(`渠道 ${channelId} 长轮询异常: ${err.message}`);
          await this._sleep(5000);
        }
      }
    };

    poll().catch(err => {
      logger.error(`渠道 ${channelId} 长轮询退出异常:`, err.message);
    });
  }

  /**
   * 将 context_token 持久化到渠道配置中
   */
  async _saveContextToken(channelId, contextToken) {
    try {
      const channel = ChannelModel.findById(channelId);
      if (!channel) return;

      if (channel.config.contextToken === contextToken) return; // 未变化，跳过

      channel.config.contextToken = contextToken;
      ChannelModel.update(channelId, { config: channel.config });
      logger.info(`渠道 ${channelId} 已更新 context_token`);
    } catch (err) {
      logger.warn(`渠道 ${channelId} 保存 context_token 失败: ${err.message}`);
    }
  }

  /**
   * 重置推送额度（用户主动发消息时调用）
   * 重置 sendCount 为 0，更新 lastUserMsgTime 为当前时间
   */
  async _resetPushQuota(channelId) {
    try {
      const channel = ChannelModel.findById(channelId);
      if (!channel) return;

      const config = channel.config;
      const now = Date.now();
      const countBefore = config.sendCount || 0;

      // 仅当计数不为0或时间有变化时才更新，减少无效写库
      if (countBefore !== 0 || !config.lastUserMsgTime) {
        config.sendCount = 0;
        config.lastUserMsgTime = now;
        ChannelModel.update(channelId, { config });
        logger.info(`渠道 ${channelId} 用户活跃，推送额度已重置（之前已发送 ${countBefore} 条）`);
      } else {
        config.lastUserMsgTime = now;
        ChannelModel.update(channelId, { config });
      }
      // 用户活跃后清除已提醒标记，允许下一次不活跃时再次提醒
      this.remindedSet.delete(channelId);
    } catch (err) {
      logger.warn(`渠道 ${channelId} 重置推送额度失败: ${err.message}`);
    }
  }

  /**
   * 定时检查所有渠道，对不活跃超过阈值的渠道主动推送提醒
   * 同时兼容服务重启场景：通过 DB 中的 lastRemindTime 避免重复发送
   */
  async _checkInactiveChannels() {
    const channels = this._getActiveChannels();
    const now = Date.now();

    for (const channel of channels) {
      const { id: channelId, config } = channel;
      if (!config.lastUserMsgTime) continue;

      const elapsed = now - config.lastUserMsgTime;

      // 超过阈值且尚未提醒过（内存标记 + DB 兜底）
      const alreadyReminded = this.remindedSet.has(channelId) ||
        (config.lastRemindTime && config.lastRemindTime > config.lastUserMsgTime);

      if (elapsed >= INACTIVE_REMIND_THRESHOLD && !alreadyReminded) {
        logger.info(`渠道 ${channelId} 用户已 ${Math.round(elapsed / 60000)} 分钟未活跃，发送主动提醒`);
        await this._sendInactiveReminder(channel);
        this.remindedSet.add(channelId);
      }
    }
  }

  /**
   * 向不活跃渠道发送主动提醒消息
   */
  async _sendInactiveReminder(channel) {
    const { id: channelId, config } = channel;
    const { token, baseUrl, toUserId, contextToken } = config;

    if (!token || !toUserId) {
      logger.warn(`渠道 ${channelId} 配置不完整，跳过主动提醒`);
      return;
    }

    try {
      const client = new IlinkClient({ baseUrl, token });
      await client.sendTextMessage({
        toUserId,
        text: '⚠️会话即将到期，请回复任意消息即可保持机器人推送畅通',
        contextToken,
      });

      // 发送成功后更新提醒时间，避免重复发送
      const channel = ChannelModel.findById(channelId);
      if (channel) {
        channel.config.lastRemindTime = Date.now();
        ChannelModel.update(channelId, { config: channel.config });
      }

      logger.info(`渠道 ${channelId} 主动提醒发送成功`);
    } catch (err) {
      // ret=-2 表示上下文已过期，无需重试
      if (err.retCode === -2) {
        logger.warn(`渠道 ${channelId} 上下文已过期，跳过主动提醒`);
        this.remindedSet.add(channelId);
        return;
      }
      logger.warn(`渠道 ${channelId} 主动提醒发送失败: ${err.message}`);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例
const clawbotMonitor = new ClawbotMonitor();
module.exports = clawbotMonitor;
