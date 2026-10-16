const { PushLogModel } = require('../models');
const logger = require('../utils/logger');

/**
 * 推送记录保留策略（retention）
 *
 * 随推送量增长，push_logs 会持续膨胀。该服务按天清理超过保留期的旧记录，
 * 保留期可通过环境变量 PUSH_LOG_RETENTION_DAYS 配置（默认 90 天）。
 */

// 保留天数：超过该天数的推送记录将被清理
const RETENTION_DAYS = parseInt(process.env.PUSH_LOG_RETENTION_DAYS, 10) || 90;

// 清理执行间隔：每天一次
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// 启动后延迟首次执行，避免与初始化争抢资源
const FIRST_RUN_DELAY_MS = 60 * 1000;

let timer = null;

/**
 * 执行一次清理，返回被删除的记录数
 */
function runCleanup(days = RETENTION_DAYS) {
  try {
    const { changes } = PushLogModel.cleanup(days);
    if (changes > 0) {
      logger.info(`[retention] 已清理 ${changes} 条超过 ${days} 天的推送记录`);
    } else {
      logger.debug(`[retention] 无超过 ${days} 天的推送记录需要清理`);
    }
    return changes;
  } catch (err) {
    logger.error('[retention] 清理推送记录失败:', err.message);
    return 0;
  }
}

/**
 * 启动定时清理任务
 */
function start() {
  if (timer) return;
  if (process.env.PUSH_LOG_RETENTION_DISABLED === 'true') {
    logger.info('[retention] 推送记录清理已通过 PUSH_LOG_RETENTION_DISABLED 禁用');
    return;
  }

  // 首次延迟执行，之后按天循环
  timer = setTimeout(() => {
    runCleanup();
    timer = setInterval(() => runCleanup(), CLEANUP_INTERVAL_MS);
  }, FIRST_RUN_DELAY_MS);

  // 避免定时器阻止进程退出
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  logger.info(`[retention] 推送记录保留策略已启动（保留 ${RETENTION_DAYS} 天，每日清理）`);
}

/**
 * 停止定时清理任务（优雅关闭时调用）
 */
function stop() {
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  RETENTION_DAYS,
  runCleanup,
  start,
  stop,
};
