/**
 * ChannelService 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过替换 require.cache 中的 models 模块注入内存 Mock，隔离数据库依赖，
 * 验证渠道 CRUD 的鉴权、配置校验、yuanbaobot 重连触发与异常处理。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

const modelsPath = require.resolve('../../../src/models');
const fakeChannels = new Map();
let _channelModel;
let yuanMonitorMock;

require.cache[modelsPath] = {
  id: modelsPath,
  filename: modelsPath,
  loaded: true,
  exports: {
    UserModel: {},
    EndpointModel: {},
    PushLogModel: {},
    RefreshTokenModel: {},
    SettingsModel: {
      getBoolean: () => false,
    },
    ChannelModel: (_channelModel = {
      findByUserId: async (userId) => [...fakeChannels.values()].filter((c) => c.user_id === userId),
      findById: async (id) => fakeChannels.get(Number(id)) || null,
      create: async (data) => {
        const created = { id: 100, ...data };
        fakeChannels.set(created.id, created);
        return created;
      },
      update: async (id, data) => {
        const cur = fakeChannels.get(Number(id));
        Object.assign(cur, data);
        return cur;
      },
      delete: async (id) => fakeChannels.delete(Number(id)),
    }),
  },
};

// yuanbaobot 监控器为 channel.service 内部动态 require，需在加载前覆盖缓存
const yuanMonitorPath = require.resolve('../../../src/services/yuanbaobot/yuanbaobot-monitor');
const yuanCalls = { add: [], remove: [] };
yuanMonitorMock = {
  addChannel: (...a) => { yuanCalls.add.push(a); },
  removeChannel: (...a) => { yuanCalls.remove.push(a); },
};
delete require.cache[yuanMonitorPath];
require.cache[yuanMonitorPath] = {
  id: yuanMonitorPath,
  filename: yuanMonitorPath,
  loaded: true,
  exports: yuanMonitorMock,
};

// axios Mock（模块加载期注入，确保 adapter 使用假实现）
const axiosPath = require.resolve('axios');
delete require.cache[axiosPath];
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: () => Promise.resolve({ data: { errcode: 0, errmsg: 'ok' } }) },
};

const ChannelService = require('../../../src/services/channel.service');

beforeEach(() => {
  fakeChannels.clear();
  yuanCalls.add.length = 0;
  yuanCalls.remove.length = 0;
});

// 监控器已在模块加载期安装，此函数保留为兼容无操作
function installYuanMonitor() {}

test('getChannels：按 userId 过滤', async () => {
  fakeChannels.set(1, { id: 1, user_id: 7, name: 'A' });
  fakeChannels.set(2, { id: 2, user_id: 8, name: 'B' });
  const list = await ChannelService.getChannels(7);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].name, 'A');
});

test('getChannelTypes：透传注册的渠道类型', () => {
  const types = ChannelService.getChannelTypes();
  assert.ok(Array.isArray(types));
  assert.ok(types.some((t) => t.type === 'wecom'));
});

test('getChannel：存在且归属正确', async () => {
  fakeChannels.set(5, { id: 5, user_id: 1, name: 'C' });
  const ch = await ChannelService.getChannel(5, 1);
  assert.strictEqual(ch.name, 'C');
});

test('getChannel：不存在抛错', async () => {
  await assert.rejects(() => ChannelService.getChannel(99, 1), /渠道不存在/);
});

test('getChannel：归属他人抛错', async () => {
  fakeChannels.set(5, { id: 5, user_id: 2, name: 'C' });
  await assert.rejects(() => ChannelService.getChannel(5, 1), /渠道不存在/);
});

test('createChannel：校验失败抛错（配置非法）', async () => {
  await assert.rejects(
    () => ChannelService.createChannel(1, { channelType: 'wecom', name: 'X', config: { key: '' } }),
    /机器人Key不能为空/
  );
});

test('createChannel：成功并写入默认 is_active', async () => {
  const ch = await ChannelService.createChannel(1, {
    channelType: 'wecom',
    name: 'X',
    config: { key: 'abc' },
  });
  assert.strictEqual(ch.id, 100);
  assert.strictEqual(ch.is_active, true);
  assert.strictEqual(ch.user_id, 1);
});

test('createChannel：yuanbaobot 类型触发 WS 连接', async () => {
  installYuanMonitor();
  await ChannelService.createChannel(1, {
    channelType: 'yuanbaobot',
    name: 'Y',
    config: { appKey: 'k', appSecret: 's' },
  });
  assert.strictEqual(yuanCalls.add.length, 1);
  assert.strictEqual(yuanCalls.add[0][0], 100);
});

test('updateChannel：不存在抛错', async () => {
  await assert.rejects(() => ChannelService.updateChannel(99, 1, {}), /渠道不存在/);
});

test('updateChannel：重命名仅更新 name', async () => {
  fakeChannels.set(3, { id: 3, user_id: 1, channel_type: 'wecom', config: { key: 'a' } });
  const res = await ChannelService.updateChannel(3, 1, { name: 'new' });
  assert.strictEqual(res.name, 'new');
  assert.strictEqual(res.config.key, 'a');
});

test('updateChannel：配置校验失败抛错', async () => {
  fakeChannels.set(3, { id: 3, user_id: 1, channel_type: 'wecom', config: { key: 'a' } });
  await assert.rejects(
    () => ChannelService.updateChannel(3, 1, { config: { key: '' } }),
    /机器人Key不能为空/
  );
});

test('updateChannel：yuanbaobot 凭证变更触发重连', async () => {
  installYuanMonitor();
  fakeChannels.set(3, {
    id: 3,
    user_id: 1,
    channel_type: 'yuanbaobot',
    config: { appKey: 'k', appSecret: 's' },
  });
  await ChannelService.updateChannel(3, 1, { config: { appKey: 'k2', appSecret: 's2' } });
  assert.strictEqual(yuanCalls.remove.length, 1);
  assert.strictEqual(yuanCalls.add.length, 1);
});

test('updateChannel：yuanbaobot 凭证未变不触发重连', async () => {
  installYuanMonitor();
  fakeChannels.set(3, {
    id: 3,
    user_id: 1,
    channel_type: 'yuanbaobot',
    config: { appKey: 'k', appSecret: 's' },
  });
  await ChannelService.updateChannel(3, 1, { config: { appKey: 'k', appSecret: 's' } });
  assert.strictEqual(yuanCalls.remove.length, 0);
  assert.strictEqual(yuanCalls.add.length, 0);
});

test('deleteChannel：不存在抛错', async () => {
  await assert.rejects(() => ChannelService.deleteChannel(99, 1), /渠道不存在/);
});

test('deleteChannel：成功并触发 yuanbaobot 清理', async () => {
  installYuanMonitor();
  fakeChannels.set(3, { id: 3, user_id: 1, channel_type: 'yuanbaobot', config: {} });
  const res = await ChannelService.deleteChannel(3, 1);
  assert.strictEqual(res, true);
  assert.strictEqual(fakeChannels.has(3), false);
  assert.strictEqual(yuanCalls.remove.length, 1);
});

test('testChannel：渠道禁用抛错', async () => {
  fakeChannels.set(4, { id: 4, user_id: 1, is_active: false, channel_type: 'wecom', config: { key: 'a' } });
  await assert.rejects(() => ChannelService.testChannel(4, 1), /渠道已禁用/);
});

test('testChannel：激活渠道调用 adapter.test（成功）', async () => {
  fakeChannels.set(4, { id: 4, user_id: 1, is_active: true, channel_type: 'wecom', config: { key: 'abc' } });
  const res = await ChannelService.testChannel(4, 1);
  assert.strictEqual(res.success, true);
});
