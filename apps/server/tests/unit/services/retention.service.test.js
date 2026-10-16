/**
 * 推送记录保留（retention）策略单元测试
 *
 * 使用临时数据库，避免影响开发/测试用的真实库。
 */
process.env.DB_PATH = require('path').join(
  require('os').tmpdir(),
  `magicpush-retention-${process.pid}.db`
);

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const initDatabase = require('../../../src/database/init');
const db = require('../../../src/config/database');
const { PushLogModel } = require('../../../src/models');
const { runCleanup } = require('../../../src/services/retention.service');

after(() => {
  try {
    db.close();
  } catch { /* ignore */ }
  fs.rmSync(process.env.DB_PATH, { force: true });
});

test('cleanup 删除超过保留期的记录并保留近期记录', async () => {
  await initDatabase();

  // push_logs.user_id 有外键约束，先插入一个测试用户
  const userId = db.prepare(
    "INSERT INTO users (username, email, password) VALUES ('retention_test', 'rt@example.com', 'x')"
  ).run().lastInsertRowid;

  const old = PushLogModel.create({
    user_id: userId, title: 'old', content: 'old', status: 'success', request_id: 'r-old',
  });
  db.prepare("UPDATE push_logs SET created_at = datetime('now', 'localtime', '-100 days') WHERE id = ?").run(old.id);

  const fresh = PushLogModel.create({
    user_id: userId, title: 'new', content: 'new', status: 'success', request_id: 'r-new',
  });

  // days=0 表示删除所有早于「现在」的记录
  const removed = runCleanup(0);

  assert.ok(removed >= 1, '应至少删除 1 条旧记录');
  assert.strictEqual(PushLogModel.findById(old.id), undefined, '超旧记录应被删除');
  assert.ok(PushLogModel.findById(fresh.id), '近期记录应保留');

  db.prepare('DELETE FROM push_logs WHERE id IN (?, ?)').run(old.id, fresh.id);
});

test('push_logs 记录并可按 request_id 查询', () => {
  const userId = db.prepare(
    "INSERT INTO users (username, email, password) VALUES ('retention_test2', 'rt2@example.com', 'x')"
  ).run().lastInsertRowid;

  const log = PushLogModel.create({
    user_id: userId, title: 't', content: 'c', status: 'success', request_id: 'req-xyz-1',
  });

  assert.strictEqual(log.request_id, 'req-xyz-1');
  const found = PushLogModel.findByRequestId('req-xyz-1');
  assert.ok(found.some((r) => r.id === log.id), '应能通过 request_id 查到该记录');

  db.prepare('DELETE FROM push_logs WHERE id = ?').run(log.id);
});
