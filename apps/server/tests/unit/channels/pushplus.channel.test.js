/**
 * PushPlus 渠道适配器单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 覆盖：通用分支 type→template 映射、渠道特有类型 custom 的可选参数合并、
 * channelType 路由与业务状态码校验等行为。
 *
 * 运行方式（任选其一）：
 *   pnpm test
 *   node --test tests
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// 在加载渠道模块前注入 axios mock
let lastPost = null;
const axiosMock = {
  post(url, body, config) {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { code: 200, msg: 'ok', data: 'msgId123' } });
  },
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: axiosMock,
};

const PushPlusChannel = require('../../../src/services/channels/pushplus.channel');

beforeEach(() => {
  lastPost = null;
  axiosMock.post = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { code: 200, msg: 'ok', data: 'msgId123' } });
  };
});

test('getSupportedTypes 返回 text/markdown/html', () => {
  assert.deepStrictEqual(PushPlusChannel.getSupportedTypes(), ['text', 'markdown', 'html']);
});

test('getChannelSpecificTypes 注册 custom 类型', () => {
  const types = PushPlusChannel.getChannelSpecificTypes();
  assert.strictEqual(types.length, 1);
  assert.strictEqual(types[0].value, 'custom');
  assert.ok(Array.isArray(types[0].fields));
  assert.ok(types[0].fields.length > 0);
});

test('通用分支兼容：type 映射为 template（text→txt, markdown→markdown, html→html）', async () => {
  const channel = new PushPlusChannel({ token: 't' });

  await channel.send({ title: 'T', content: 'c', type: 'text' });
  assert.strictEqual(lastPost.body.template, 'txt');
  assert.strictEqual(lastPost.body.channel, undefined);

  await channel.send({ title: 'T', content: 'c', type: 'markdown' });
  assert.strictEqual(lastPost.body.template, 'markdown');

  await channel.send({ title: 'T', content: 'c', type: 'html' });
  assert.strictEqual(lastPost.body.template, 'html');
});

test('通用分支：无 channelType 时仍走原有逻辑（向后兼容）', async () => {
  const channel = new PushPlusChannel({ token: 't', topic: 'g' });
  await channel.send({ title: '标题', content: '正文', type: 'text' });
  assert.strictEqual(lastPost.body.title, '标题');
  assert.strictEqual(lastPost.body.content, '正文');
  assert.strictEqual(lastPost.body.topic, 'g');
  assert.strictEqual(lastPost.body.channel, undefined);
});

test('custom：template 显式指定时生效', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  await channel.send({
    title: 'T', content: 'c', type: 'text',
    channelType: 'custom',
    extraData: { template: 'json' },
  });
  assert.strictEqual(lastPost.body.template, 'json');
});

test('custom：未指定 template 时回退通用 type 推导', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  await channel.send({
    title: 'T', content: 'c', type: 'markdown',
    channelType: 'custom',
    extraData: {},
  });
  assert.strictEqual(lastPost.body.template, 'markdown');
});

test('custom：option 为 object 时被 JSON.stringify', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  await channel.send({
    title: 'T', content: 'c', type: 'text',
    channelType: 'custom',
    extraData: { option: { url: 'https://x.com/hook', key: 'k' } },
  });
  assert.strictEqual(lastPost.body.option, JSON.stringify({ url: 'https://x.com/hook', key: 'k' }));
});

test('custom：option 为 string 时原样透传', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  const raw = '{"url":"https://x.com/hook"}';
  await channel.send({
    title: 'T', content: 'c', type: 'text',
    channelType: 'custom',
    extraData: { option: raw },
  });
  assert.strictEqual(lastPost.body.option, raw);
});

test('custom：channel/callbackUrl/timestamp/pre 仅在提供时追加', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  await channel.send({
    title: 'T', content: 'c', type: 'text',
    channelType: 'custom',
    extraData: {
      channel: 'webhook',
      callbackUrl: 'https://cb.com/x',
      timestamp: 1700000000000,
      pre: 'code',
    },
  });
  assert.strictEqual(lastPost.body.channel, 'webhook');
  assert.strictEqual(lastPost.body.callbackUrl, 'https://cb.com/x');
  assert.strictEqual(lastPost.body.timestamp, 1700000000000);
  assert.strictEqual(lastPost.body.pre, 'code');
  // 未提供则不出现
  assert.strictEqual(lastPost.body.option, undefined);
});

test('custom：extraData.topic 覆盖渠道配置 topic', async () => {
  const channel = new PushPlusChannel({ token: 't', topic: 'default-group' });
  await channel.send({
    title: 'T', content: 'c', type: 'text',
    channelType: 'custom',
    extraData: { topic: 'override-group' },
  });
  assert.strictEqual(lastPost.body.topic, 'override-group');
});

test('custom：未提供 extraData.topic 时回退渠道配置 topic', async () => {
  const channel = new PushPlusChannel({ token: 't', topic: 'default-group' });
  await channel.send({
    title: 'T', content: 'c', type: 'text',
    channelType: 'custom',
    extraData: {},
  });
  assert.strictEqual(lastPost.body.topic, 'default-group');
});

test('custom：namespace 内的 title/content 覆盖顶层', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  await channel.send({
    title: '顶层标题', content: '顶层内容', type: 'text',
    channelType: 'custom',
    extraData: { title: '专属标题', content: '专属内容' },
  });
  assert.strictEqual(lastPost.body.title, '专属标题');
  assert.strictEqual(lastPost.body.content, '专属内容');
});

test('sendChannelSpecific 未知类型抛错', async () => {
  const channel = new PushPlusChannel({ token: 't' });
  await assert.rejects(
    () => channel.sendChannelSpecific('image', {}),
    /不支持的 PushPlus 特有类型/
  );
});

test('业务状态码非 200 时抛出错误', async () => {
  axiosMock.post = () => Promise.resolve({ data: { code: 600, msg: '数据异常' } });
  const channel = new PushPlusChannel({ token: 't' });
  await assert.rejects(
    () => channel.send({ title: 'T', content: 'c', type: 'text' }),
    /数据异常/
  );
});
