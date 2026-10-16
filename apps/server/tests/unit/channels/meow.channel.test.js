/**
 * Meow 渠道适配器单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中 axios 的解析结果来 mock 网络请求，
 * 验证消息类型原生透传、渠道特有参数（url/imgUrl/htmlHeight）、
 * channelType 解耦以及业务状态码校验等行为。
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
    return Promise.resolve({ data: { status: 200, message: '推送成功' } });
  },
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: axiosMock,
};

const MeowChannel = require('../../../src/services/channels/meow.channel');

beforeEach(() => {
  lastPost = null;
});

test('getSupportedTypes 返回 text/markdown/html', () => {
  assert.deepStrictEqual(MeowChannel.getSupportedTypes(), ['text', 'markdown', 'html']);
});

test('getChannelSpecificTypes 注册三种 Meow 专属类型', () => {
  const types = MeowChannel.getChannelSpecificTypes();
  assert.strictEqual(types.length, 3);
  assert.ok(types.every((t) => ['text', 'markdown', 'html'].includes(t.value)));
});

test('通用分支：text 原生透传，不转换内容', async () => {
  const channel = new MeowChannel({ nickname: 'bot', msgType: 'text' }, 1);
  await channel.send({ title: 'T', content: '# 标题\n内容', type: 'text' });
  assert.strictEqual(lastPost.config.params.msgType, 'text');
  assert.strictEqual(lastPost.body.msg, '# 标题\n内容');
  assert.strictEqual(lastPost.config.params.htmlHeight, undefined);
});

test('通用分支：markdown 原生透传（不再转纯文本）', async () => {
  const channel = new MeowChannel({ nickname: 'bot' }, 1);
  await channel.send({ title: 'T', content: '**加粗**', type: 'markdown' });
  assert.strictEqual(lastPost.config.params.msgType, 'markdown');
  assert.strictEqual(lastPost.body.msg, '**加粗**');
});

test('通用分支：html 透传并附带默认 htmlHeight', async () => {
  const channel = new MeowChannel({ nickname: 'bot', htmlHeight: 300 }, 1);
  await channel.send({ title: 'T', content: '<b>x</b>', type: 'html' });
  assert.strictEqual(lastPost.config.params.msgType, 'html');
  assert.strictEqual(lastPost.config.params.htmlHeight, 300);
});

test('渠道特有参数来自 extraData 命名空间：url/imgUrl/htmlHeight', async () => {
  const channel = new MeowChannel({ nickname: 'bot', htmlHeight: 200 }, 1);
  await channel.send({
    title: 'T',
    content: 'hi',
    type: 'text',
    extraData: {
      url: 'https://example.com',
      imgUrl: 'https://x.com/i.png',
      htmlHeight: 360,
    },
  });
  // url/imgUrl 在 JSON body 中（官方：application/json 模式 Body 优先）
  assert.strictEqual(lastPost.body.url, 'https://example.com');
  assert.strictEqual(lastPost.body.imgUrl, 'https://x.com/i.png');
  assert.strictEqual(lastPost.config.params.url, undefined);
  assert.strictEqual(lastPost.config.params.imgUrl, undefined);
  // htmlHeight 仅在 html 时生效，text 不发送
  assert.strictEqual(lastPost.config.params.htmlHeight, undefined);
});

test('channelType 优先于全局 type（解耦）', async () => {
  const channel = new MeowChannel({ nickname: 'bot', msgType: 'text' }, 1);
  await channel.send({
    title: 'T',
    content: '<b>x</b>',
    type: 'text',
    channelType: 'html',
    extraData: { htmlHeight: 420 },
  });
  assert.strictEqual(lastPost.config.params.msgType, 'html');
  assert.strictEqual(lastPost.config.params.htmlHeight, 420);
});

test('extraData 命名空间的 title/content 覆盖顶层（多渠道独立内容）', async () => {
  const channel = new MeowChannel({ nickname: 'bot', msgType: 'text' }, 1);
  await channel.send({
    title: '全局标题',
    content: '全局纯文本',
    type: 'text',
    extraData: {
      title: 'Meow 专属标题',
      content: '<h2>专属 HTML</h2>',
    },
  });
  // 实际发送的是命名空间内的内容，而非顶层纯文本
  assert.strictEqual(lastPost.body.title, 'Meow 专属标题');
  assert.strictEqual(lastPost.body.msg, '<h2>专属 HTML</h2>');
});

test('channelType=html 配合 ns.content 渲染独立 HTML 而非顶层纯文本', async () => {
  const channel = new MeowChannel({ nickname: 'bot', msgType: 'text' }, 1);
  await channel.send({
    title: '全局',
    content: '全局纯文本无标签',
    type: 'text',
    channelType: 'html',
    extraData: {
      content: '<h2>服务器告警</h2><p>CPU <strong>90%</strong></p>',
      htmlHeight: 300,
    },
  });
  // 关键：Meow 拿到的是命名空间里的 HTML，而不是顶层那份没标签的纯文本
  assert.strictEqual(lastPost.config.params.msgType, 'html');
  assert.strictEqual(lastPost.body.msg, '<h2>服务器告警</h2><p>CPU <strong>90%</strong></p>');
  assert.strictEqual(lastPost.config.params.htmlHeight, 300);
});

test('未传入 ns.title/content 时回退顶层（向后兼容）', async () => {
  const channel = new MeowChannel({ nickname: 'bot' }, 1);
  await channel.send({
    title: '顶层标题',
    content: '顶层内容',
    type: 'text',
    extraData: { url: 'https://example.com' },
  });
  assert.strictEqual(lastPost.body.title, '顶层标题');
  assert.strictEqual(lastPost.body.msg, '顶层内容');
});

test('不传 extraData 时回退默认 htmlHeight，且不发送 url/imgUrl', async () => {
  const channel = new MeowChannel({ nickname: 'bot' }, 1);
  await channel.send({ title: 'T', content: 'x', type: 'text' });
  assert.strictEqual(lastPost.body.url, undefined);
  assert.strictEqual(lastPost.body.imgUrl, undefined);
});

test('channelType=markdown 时 url/imgUrl 放入 body 而非 query（修复用户反馈 url 不生效）', async () => {
  const channel = new MeowChannel({ nickname: 'bot' }, 1);
  await channel.send({
    title: '',
    content: '111',
    type: 'text',
    channelType: 'markdown',
    extraData: {
      title: '系统告警',
      content: '服务器 CPU 使用率超过 90%',
      url: 'https://github.com/magiccode1412/magicpush/issues/27',
      imgUrl: 'https://avatars.githubusercontent.com/u/208285284?v=4&s=216',
      htmlHeight: '400',
    },
  });
  assert.strictEqual(lastPost.config.params.msgType, 'markdown');
  // 关键修复：url/imgUrl 在 JSON body 中，App 才能读取
  assert.strictEqual(lastPost.body.url, 'https://github.com/magiccode1412/magicpush/issues/27');
  assert.strictEqual(lastPost.body.imgUrl, 'https://avatars.githubusercontent.com/u/208285284?v=4&s=216');
  // url/imgUrl 不应在 query 中（JSON 模式下 App 不读 query 的 url/imgUrl）
  assert.strictEqual(lastPost.config.params.url, undefined);
  assert.strictEqual(lastPost.config.params.imgUrl, undefined);
  // htmlHeight 仅在 html 时发送，markdown 下不发送
  assert.strictEqual(lastPost.config.params.htmlHeight, undefined);
});

test('业务状态码非 200 时抛出错误（修复误报成功）', async () => {
  axiosMock.post = () => Promise.resolve({ data: { status: 400, msg: '昵称不存在' } });
  const channel = new MeowChannel({ nickname: 'ghost' }, 1);
  await assert.rejects(
    () => channel.send({ title: 'T', content: 'x', type: 'text' }),
    /昵称不存在/
  );
});

test('sendChannelSpecific 未知类型抛错', async () => {
  const channel = new MeowChannel({ nickname: 'bot' }, 1);
  await assert.rejects(
    () => channel.sendChannelSpecific('image', { title: 'T', content: 'x', extraData: {} }),
    /不支持的 Meow 渠道特有类型/
  );
});

test('validate 校验 htmlHeight 必须为正整数', () => {
  const channel = new MeowChannel({ nickname: 'bot' }, 1);
  assert.strictEqual(channel.validate({ nickname: 'b', htmlHeight: 0 }).valid, false);
  assert.strictEqual(channel.validate({ nickname: 'b', htmlHeight: -1 }).valid, false);
  assert.strictEqual(channel.validate({ nickname: 'b', htmlHeight: 1.5 }).valid, false);
  assert.strictEqual(channel.validate({ nickname: 'b', msgType: 'pdf' }).valid, false);
  assert.strictEqual(channel.validate({ nickname: 'b', htmlHeight: 250 }).valid, true);
});
