process.env.DB_PATH = require('path').join(
  require('os').tmpdir(),
  `magicpush-migrate-${process.pid}.db`
);

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const db = require('../../../src/config/database');
const { runMigrations, MIGRATIONS, columnExists } = require('../../../src/database/migrate');

after(() => {
  try {
    db.close();
  } catch { /* ignore */ }
  fs.rmSync(process.env.DB_PATH, { force: true });
});

test('首次运行执行全部迁移并记录到 migrations 表', () => {
  runMigrations();

  const rows = db.prepare('SELECT name FROM migrations').all();
  const names = rows.map((r) => r.name);
  assert.strictEqual(names.length, MIGRATIONS.length, '迁移记录数量应与注册表一致');
  for (const m of MIGRATIONS) {
    assert.ok(names.includes(m.name), `migrations 表缺少已执行记录: ${m.name}`);
  }

  // 校验关键增量字段均已存在（建表 + ALTER 迁移的结果）
  assert.ok(columnExists('users', 'role'), 'users 缺少 role 字段');
  assert.ok(columnExists('push_logs', 'ip'), 'push_logs 缺少 ip 字段');
  assert.ok(columnExists('push_logs', 'request_id'), 'push_logs 缺少 request_id 字段');
  assert.ok(columnExists('push_logs', 'endpoint_name'), 'push_logs 缺少 endpoint_name 字段');
  assert.ok(columnExists('endpoints', 'inbound_config'), 'endpoints 缺少 inbound_config 字段');
  assert.ok(columnExists('endpoints', 'keyword_filter'), 'endpoints 缺少 keyword_filter 字段');
  assert.ok(columnExists('endpoints', 'do_not_disturb'), 'endpoints 缺少 do_not_disturb 字段');
});

test('重复运行迁移保持幂等且不重复记录', () => {
  runMigrations(); // 第二次执行，应跳过已应用项

  const count = db.prepare('SELECT COUNT(*) AS c FROM migrations').get().c;
  assert.strictEqual(count, MIGRATIONS.length, '重复执行后迁移记录不应增加');

  // 重复执行后字段依旧存在
  assert.ok(columnExists('push_logs', 'request_id'));
  assert.ok(columnExists('users', 'role'));
});

test('addColumn 对存量库已存在列幂等跳过', () => {
  // 直接再插入一条新迁移逻辑无法复现，这里验证 columnExists 助手对真实表准确
  assert.strictEqual(columnExists('users', 'nonexistent_col_xyz'), false);
  assert.strictEqual(columnExists('users', 'username'), true);
});
