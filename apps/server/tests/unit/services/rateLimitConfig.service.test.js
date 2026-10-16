/**
 * RateLimitConfigService 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过替换 require.cache 中的 settings.model 注入内存 Mock，
 * 隔离数据库依赖，验证边界裁剪、默认值回退、批量设置与开关读写。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// 在加载服务前注入 settings.model Mock
const settingsPath = require.resolve('../../../src/models/settings.model');
let store;
require.cache[settingsPath] = {
  id: settingsPath,
  filename: settingsPath,
  loaded: true,
  exports: {
    get: (key) => (store.has(key) ? store.get(key) : null),
    set: (key, value) => {
      store.set(key, String(value));
    },
    setBoolean: (key, value) => {
      store.set(key, value ? 'true' : 'false');
    },
  },
};

const RateLimitConfigService = require('../../../src/services/rateLimitConfig.service');

beforeEach(() => {
  store = new Map();
});

test('get：命中存储值并裁剪到边界', () => {
  store.set('rate_limit_global_max', '5000');
  assert.strictEqual(RateLimitConfigService.get('rate_limit_global_max'), 1000); // 上限 1000
  store.set('rate_limit_global_max', '50');
  assert.strictEqual(RateLimitConfigService.get('rate_limit_global_max'), 50);
});

test('get：非数字存储值回退默认值', () => {
  store.set('rate_limit_global_max', 'abc');
  assert.strictEqual(RateLimitConfigService.get('rate_limit_global_max'), 200);
});

test('get：存储为空回退默认值', () => {
  assert.strictEqual(RateLimitConfigService.get('rate_limit_login_max'), 5);
});

test('set：合法值裁剪并写回', () => {
  const v = RateLimitConfigService.set('rate_limit_login_max', 999);
  assert.strictEqual(v, 20); // 上限 20
  assert.strictEqual(store.get('rate_limit_login_max'), '20');
});

test('set：未知配置项抛错', () => {
  assert.throws(() => RateLimitConfigService.set('unknown_key', 1), /未知的配置项/);
});

test('set：非数字配置值抛错', () => {
  assert.throws(
    () => RateLimitConfigService.set('rate_limit_login_max', 'abc'),
    /配置值必须是数字/
  );
});

test('setMany：仅写入已知键并返回裁剪后结果', () => {
  const r = RateLimitConfigService.setMany({
    rate_limit_login_max: 999,
    rate_limit_register_max: 2,
    unknown_key: 5,
  });
  assert.strictEqual(r.rate_limit_login_max, 20);
  assert.strictEqual(r.rate_limit_register_max, 2);
  assert.strictEqual(store.has('unknown_key'), false);
});

test('isEnabled / setEnabled：默认启用，可切换', () => {
  store.delete('rate_limit_enabled');
  assert.strictEqual(RateLimitConfigService.isEnabled(), true);
  store.set('rate_limit_enabled', 'false');
  assert.strictEqual(RateLimitConfigService.isEnabled(), false);
  RateLimitConfigService.setEnabled(true);
  assert.strictEqual(RateLimitConfigService.isEnabled(), true);
  assert.strictEqual(store.get('rate_limit_enabled'), 'true');
});

test('reset：恢复默认值并写回存储', () => {
  store.set('rate_limit_global_max', '9999');
  const all = RateLimitConfigService.reset();
  assert.strictEqual(all.rate_limit_global_max, 200);
  assert.strictEqual(store.get('rate_limit_global_max'), '200');
});

test('getAll：返回全部配置', () => {
  const all = RateLimitConfigService.getAll();
  assert.strictEqual(all.rate_limit_global_max, 200);
  assert.strictEqual(all.rate_limit_login_max, 5);
});

test('getDefaults / getBounds：返回副本而非内部引用', () => {
  const d = RateLimitConfigService.getDefaults();
  assert.notStrictEqual(d, RateLimitConfigService.getDefaults());
  assert.strictEqual(d.rate_limit_global_max, 200);
  const b = RateLimitConfigService.getBounds();
  assert.strictEqual(b.rate_limit_login_max.max, 20);
  assert.strictEqual(b.rate_limit_login_max.min, 1);
});
