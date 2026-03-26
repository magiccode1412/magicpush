const { ChannelModel } = require('../../models');
const IlinkClient = require('./ilink-client');
const logger = require('../../utils/logger');

/**
 * ClawBot context_token 长轮询监控服务
 * 通过 getUpdates 长轮询获取用户发给 Bot 的消息，提取 context_token 并持久化
 */
class ClawbotMonitor {
  constructor() {
    this.pollingMap = new Map(); // channelId -> { abort, token }
    this.started = false;
  }

  /**
   * 启动监控，为所有已激活的 wechatclawbot 渠道开启长轮询
   */
  start() {
    if (this.started) return;
    this.started = true;

    const channels = this._getActiveChannels();
    for (const channel of channels) {
      this._startPolling(channel);
    }

    logger.info(`ClawBot 监控服务已启动，共 ${channels.length} 个渠道`);
  }

  /**
   * 停止所有监控
   */
  stop() {
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

          // 处理收到的消息，提取 context_token
          if (result.msgs && result.msgs.length > 0) {
            for (const msg of result.msgs) {
              if (msg.context_token) {
                await this._saveContextToken(channelId, msg.context_token);
              }
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

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例
const clawbotMonitor = new ClawbotMonitor();
module.exports = clawbotMonitor;
