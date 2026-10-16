/**
 * PushService 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过替换 require.cache 中的 models 与 channels 模块注入内存 Mock，隔离数据库与网络依赖，
 * 验证：关键词过滤拦截、免打扰跳过、推送结果聚合、单渠道成功/失败、按 token/endpoint/channel 推送入口。
 *
 * 说明：渠道适配器的发送细节由各渠道单测覆盖（如 webhook/bark/feishu 等），
 * 这里用可控的假 adapter 替代真实 axios 网络调用，专注测试 push.service 的编排逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// 在加载 models 之前注入依赖服务 Mock，避免被 models 加载链先行缓存为真实模块
const kfPath = require.resolve('../../../src/services/keywordFilter.service');
require.cache[kfPath] = {
  id: kfPath,
  filename: kfPath,
  loaded: true,
  exports: {
    check: (_filter, _message) => ({ blocked: false, mode: null, matchedKeyword: null }),
  },
};

const dndPath = require.resolve('../../../src/services/doNotDisturb.service');
require.cache[dndPath] = {
  id: dndPath,
  filename: dndPath,
  loaded: true,
  exports: {
    shouldMute: () => false,
  },
};

const modelsPath = require.resolve('../../../src/models');
const channelsPath = require.resolve('../../../src/services/channels');
const fakeStore = {
  endpoints: new Map(),
  channels: new Map(),
  logs: new Map(),
  settings: new Map(),
};

// 假 adapter：记录调用并返回可控结果
function makeAdapter(opts = {}) {
  const adapter = {
    calls: [],
    failWith: opts.failWith || null,
    async send(message) {
      adapter.calls.push(message);
      if (adapter.failWith) {
        const e = new Error(adapter.failWith);
        e.response = { data: { message: adapter.failWith } };
        throw e;
      }
      return { success: true, messageId: 'mid-1' };
    },
    async test() {
      return { success: true, message: 'ok' };
    },
  };
  return adapter;
}

require.cache[channelsPath] = {
  id: channelsPath,
  filename: channelsPath,
  loaded: true,
  exports: {
    // 优先使用 config._adapter（测试可注入可控 adapter），否则返回默认成功 adapter
    getChannelAdapter: (type, config, _id) => (config && config._adapter) || makeAdapter(),
  },
};

// 可变调用记录（替代 mock.fn，便于在 beforeEach 清空）
const logUpdateCalls = [];
const endpointUsedCalls = [];

require.cache[modelsPath] = {
  id: modelsPath,
  filename: modelsPath,
  loaded: true,
  exports: {
    UserModel: {},
    RefreshTokenModel: {},
    SettingsModel: {
      getBoolean: (key, def) =>
        fakeStore.settings.has(key) ? fakeStore.settings.get(key) === 'true' : def,
    },
    ChannelModel: {
      findById: async (id) => fakeStore.channels.get(Number(id)) || null,
    },
    EndpointModel: {
      findByToken: async (token) => fakeStore.endpoints.get(token) || null,
      findById: async (id) => {
        for (const ep of fakeStore.endpoints.values()) if (ep.id === Number(id)) return ep;
        return null;
      },
      updateLastUsed: async () => { endpointUsedCalls.push(1); },
      getChannels: async (id) => {
        const ep = [...fakeStore.endpoints.values()].find((e) => e.id === Number(id));
        return ep ? ep._channels || [] : [];
      },
    },
    PushLogModel: {
      create: async (data) => {
        const id = fakeStore.logs.size + 1;
        const log = { id, ...data };
        fakeStore.logs.set(id, log);
        return log;
      },
      updateStatus: async (...args) => { logUpdateCalls.push(args); },
    },
  },
};

const PushService = require('../../../src/services/push.service');

beforeEach(() => {
  fakeStore.endpoints.clear();
  fakeStore.channels.clear();
  fakeStore.logs.clear();
  fakeStore.settings.clear();
  logUpdateCalls.length = 0;
  endpointUsedCalls.length = 0;
});

function makeWebhookChannel(id, name = 'WH') {
  return { id, name, channel_type: 'webhook', config: { url: 'https://hook.test/x', _adapter: makeAdapter() }, is_active: true };
}

// ---------- 单渠道推送 ----------

test('pushToChannel：通用消息成功并记录日志', async () => {
  const ch = makeWebhookChannel(1);
  const res = await PushService.pushToChannel(1, 10, ch, { title: 'T', content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.channelId, 1);
  assert.strictEqual(res.logId, 1);
  assert.strictEqual(logUpdateCalls[0][1], 'success');
  assert.strictEqual(ch.config._adapter.calls[0].title, 'T');
});

test('pushToChannel：extraData 命名空间解析 channelType', async () => {
  const ch = { id: 2, name: 'W', channel_type: 'wecom', config: { key: 'abc', _adapter: makeAdapter() }, is_active: true };
  await PushService.pushToChannel(1, 10, ch, {
    title: 'T',
    content: 'C',
    extraData: { wecom: { channelType: 'news', articles: [{ title: 'A' }] } },
  }, '1.2.3.4');
  assert.strictEqual(ch.config._adapter.calls[0].channelType, 'news');
});

test('pushToChannel：发送失败记录 failed 并返回 error', async () => {
  const ch = { id: 3, name: 'W', channel_type: 'webhook', config: { _adapter: makeAdapter({ failWith: 'boom' }) }, is_active: true };
  const res = await PushService.pushToChannel(1, 10, ch, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, 'boom');
  assert.strictEqual(logUpdateCalls[0][1], 'failed');
});

// ---------- 免打扰跳过 ----------

test('pushToChannel：免打扰时段内跳过推送', async () => {
  fakeStore.settings.set('dnd_global_enabled', 'true');
  require.cache[dndPath].exports.shouldMute = () => true;
  fakeStore.endpoints.set('ep1', { id: 10, name: 'EP', do_not_disturb: {} });
  const ch = makeWebhookChannel(4);
  const res = await PushService.pushToChannel(1, 10, ch, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.skippedDnd, true);
  assert.strictEqual(res.logId, 1);
  assert.strictEqual(logUpdateCalls.length, 0); // 仅 create，未 updateStatus
  assert.strictEqual(ch.config._adapter.calls.length, 0); // 未实际发送
});

test('pushToChannel：全局免打扰关闭时不跳过', async () => {
  fakeStore.settings.set('dnd_global_enabled', 'false');
  require.cache[dndPath].exports.shouldMute = () => true;
  const ch = makeWebhookChannel(5);
  const res = await PushService.pushToChannel(1, 10, ch, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.skippedDnd, undefined);
  assert.strictEqual(res.success, true);
});

test('pushToChannel：endpointId 为空（pushByChannel）不触发免打扰', async () => {
  require.cache[dndPath].exports.shouldMute = () => true;
  const ch = makeWebhookChannel(6);
  const res = await PushService.pushToChannel(1, null, ch, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.skippedDnd, undefined);
  assert.strictEqual(res.success, true);
});

// ---------- 多渠道聚合 ----------

test('pushToChannels：全部成功汇总', async () => {
  const channels = [makeWebhookChannel(1), makeWebhookChannel(2), makeWebhookChannel(3)];
  const res = await PushService.pushToChannels(1, 10, channels, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.total, 3);
  assert.strictEqual(res.successCount, 3);
  assert.strictEqual(res.failedCount, 0);
  assert.strictEqual(res.success, true);
});

test('pushToChannels：部分失败汇总', async () => {
  const channels = [
    makeWebhookChannel(1),
    { id: 2, name: 'W', channel_type: 'webhook', config: { _adapter: makeAdapter({ failWith: 'fail' }) }, is_active: true },
    makeWebhookChannel(3),
  ];
  const res = await PushService.pushToChannels(1, 10, channels, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.total, 3);
  assert.strictEqual(res.successCount, 2);
  assert.strictEqual(res.failedCount, 1);
  assert.strictEqual(res.success, false);
});

// ---------- 经 token/endpoint 入口 ----------

test('pushByToken：无效令牌抛错', async () => {
  await assert.rejects(() => PushService.pushByToken('bad', { content: 'C' }), /无效的接口令牌/);
});

test('pushByToken：接口禁用抛错', async () => {
  fakeStore.endpoints.set('tk', { id: 20, is_active: false });
  await assert.rejects(() => PushService.pushByToken('tk', { content: 'C' }), /接口已禁用/);
});

test('pushByToken：未绑定渠道抛错', async () => {
  fakeStore.endpoints.set('tk', { id: 20, is_active: true, _channels: [] });
  await assert.rejects(() => PushService.pushByToken('tk', { content: 'C' }), /该接口未绑定任何渠道/);
});

test('pushByToken：成功推送并更新 lastUsed', async () => {
  fakeStore.endpoints.set('tk', { id: 20, is_active: true, _channels: [makeWebhookChannel(1)] });
  const res = await PushService.pushByToken('tk', { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.success, true);
  assert.strictEqual(endpointUsedCalls.length, 1);
});

test('pushByEndpoint：不存在抛错', async () => {
  await assert.rejects(() => PushService.pushByEndpoint(99, 1, { content: 'C' }), /接口不存在/);
});

test('pushByEndpoint：成功推送', async () => {
  fakeStore.endpoints.set('ep1', { id: 20, user_id: 1, is_active: true, _channels: [makeWebhookChannel(1)] });
  const res = await PushService.pushByEndpoint(20, 1, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.success, true);
});

test('pushByChannel：渠道不存在抛错', async () => {
  await assert.rejects(() => PushService.pushByChannel(99, 1, { content: 'C' }), /渠道不存在/);
});

test('pushByChannel：渠道禁用抛错', async () => {
  fakeStore.channels.set(30, { id: 30, user_id: 1, is_active: false, channel_type: 'webhook', config: {} });
  await assert.rejects(() => PushService.pushByChannel(30, 1, { content: 'C' }), /渠道已禁用/);
});

test('pushByChannel：成功推送（无 endpointId）', async () => {
  fakeStore.channels.set(30, { id: 30, user_id: 1, is_active: true, channel_type: 'webhook', config: { url: 'https://hook.test/x' } });
  const res = await PushService.pushByChannel(30, 1, { content: 'C' }, '1.2.3.4');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.results[0].success, true);
});

// ---------- 关键词过滤拦截 ----------

test('pushByToken：关键词命中（黑名单）拦截', async () => {
  require.cache[kfPath].exports.check = () => ({ blocked: true, mode: 'blacklist', matchedKeyword: 'spam' });
  fakeStore.endpoints.set('tk', { id: 20, is_active: true, _channels: [makeWebhookChannel(1)] });
  await assert.rejects(() => PushService.pushByToken('tk', { content: 'spam' }), /包含不合法内容/);
  assert.strictEqual(endpointUsedCalls.length, 0); // 未实际推送
});
