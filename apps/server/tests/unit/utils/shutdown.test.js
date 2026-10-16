/**
 * 优雅关闭（graceful shutdown）单元测试
 *
 * 通过 mock 验证：
 *   - 各 Bot 监控的 stop() 被调用（关闭 WS / 长轮询，避免僵尸连接）
 *   - 数据库连接被关闭
 *   - 进程以状态码 0 退出
 * 注意：本测试会真实关闭数据库连接，请置于独立测试文件以保持隔离。
 */
const { test, mock } = require('node:test');
const assert = require('node:assert');

test('gracefulShutdown 停止监控、关闭 DB 并退出', async () => {
  // 拦截 process.exit，避免真正退出测试进程
  const exitMock = mock.method(process, 'exit', () => undefined);

  const clawbotMonitor = require('../../../src/services/clawbot/clawbot-monitor');
  const yuanbaobotMonitor = require('../../../src/services/yuanbaobot/yuanbaobot-monitor');
  const qqbotMonitor = require('../../../src/services/qqbot/qqbot-monitor');
  const db = require('../../../src/config/database');

  const clawSpy = mock.method(clawbotMonitor, 'stop');
  const yuanSpy = mock.method(yuanbaobotMonitor, 'stop');
  const qqSpy = mock.method(qqbotMonitor, 'stop');
  const dbCloseSpy = mock.method(db, 'close');

  const { gracefulShutdown } = require('../../../src/utils/shutdown');
  const fakeServer = { close: (cb) => cb() };

  await gracefulShutdown('SIGTERM', fakeServer);

  assert.strictEqual(clawSpy.mock.calls.length, 1, 'ClawBot 监控应被停止');
  assert.strictEqual(yuanSpy.mock.calls.length, 1, 'Yuanbaobot 监控应被停止');
  assert.strictEqual(qqSpy.mock.calls.length, 1, 'QQBot 监控应被停止');
  assert.strictEqual(dbCloseSpy.mock.calls.length, 1, '数据库连接应被关闭');
  assert.ok(exitMock.mock.calls.length >= 1, '进程应退出');
  assert.strictEqual(exitMock.mock.calls[0].arguments[0], 0, '退出状态码应为 0');
});
