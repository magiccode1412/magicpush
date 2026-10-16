const logger = require('./logger');
const db = require('../config/database');
const clawbotMonitor = require('../services/clawbot/clawbot-monitor');
const yuanbaobotMonitor = require('../services/yuanbaobot/yuanbaobot-monitor');
const qqbotMonitor = require('../services/qqbot/qqbot-monitor');
const retentionService = require('../services/retention.service');

/**
 * 优雅关闭（graceful shutdown）
 *
 * 进程收到 SIGTERM / SIGINT 时：
 *   1. 停止定时清理任务
 *   2. 停止各 Bot 监控（关闭 WS / 长轮询，避免僵尸连接、消息丢失）
 *   3. 停止 HTTP 服务器（不再接收新请求，等待进行中的请求完成）
 *   4. 关闭数据库连接（better-sqlite3 同步关闭，先做一次 WAL checkpoint 落盘）
 */

let shuttingDown = false;

/**
 * 执行优雅关闭。
 * @param {string} signal 收到的信号名（如 'SIGTERM'）
 * @param {import('http').Server} [server] HTTP 服务器实例
 * @returns {Promise<void>}
 */
async function gracefulShutdown(signal, server) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

  // 1. 停止定时清理任务
  try {
    retentionService.stop();
  } catch (err) {
    logger.error('停止清理任务失败:', err.message);
  }

  // 2. 停止各 Bot 监控，关闭 WS / 长轮询连接
  for (const [name, monitor] of [
    ['ClawBot', clawbotMonitor],
    ['Yuanbaobot', yuanbaobotMonitor],
    ['QQBot', qqbotMonitor],
  ]) {
    try {
      monitor.stop();
    } catch (err) {
      logger.error(`停止 ${name} 监控失败:`, err.message);
    }
  }

  // 3. 停止 HTTP 服务器，不再接收新连接；等待进行中的请求完成
  if (server && typeof server.close === 'function') {
    await new Promise((resolve) => {
      const forceTimeout = setTimeout(resolve, 5000).unref();
      server.close(() => {
        clearTimeout(forceTimeout);
        resolve();
      });
    });
    logger.info('HTTP 服务器已停止');
  }

  // 4. 关闭数据库连接（先 checkpoint 落盘，再关闭）
  try {
    db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
    db.close();
    logger.info('数据库连接已关闭');
  } catch (err) {
    logger.error('关闭数据库失败:', err.message);
  }

  logger.info('优雅关闭完成');
  process.exit(0);
}

/**
 * 注册进程退出钩子
 * @param {import('http').Server} server HTTP 服务器实例
 */
function registerShutdown(server) {
  const handler = (signal) => {
    gracefulShutdown(signal, server);
  };
  process.on('SIGTERM', handler);
  process.on('SIGINT', handler);
  logger.info('已注册 SIGTERM / SIGINT 优雅关闭钩子');
}

module.exports = {
  registerShutdown,
  gracefulShutdown,
};
