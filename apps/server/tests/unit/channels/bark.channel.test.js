/**
 * BarkChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 URL 规范化、markdown/html 转换分支、可选字段、业务状态码与校验逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { code: 200 } });
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (url, body, config) => postImpl(url, body, config) },
};

const BarkChannel = require('../../../src/services/channels/bark.channel');

beforeEach(() => {
  lastPost = null;
  postImpl = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { code: 200 } });
  };
});

test('构造：去除 serverUrl 尾部斜杠', () => {
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app/', deviceKey: 'k' }, 1);
  assert.strictEqual(ch.serverUrl, 'https://api.day.app');
});

test('send：text 类型原样透传内容', async () => {
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app', deviceKey: 'k' }, 1);
  await ch.send({ title: 'T', content: 'C', type: 'text' });
  assert.strictEqual(lastPost.url, 'https://api.day.app/push');
  assert.strictEqual(lastPost.body.device_key, 'k');
  assert.strictEqual(lastPost.body.body, 'C');
  assert.strictEqual(lastPost.body.level, 'active');
});

test('send：markdown 类型剥离 Markdown 语法', async () => {
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app', deviceKey: 'k' }, 1);
  await ch.send({ title: 'T', content: '## 标题\n**加粗** [链接](http://x)', type: 'markdown' });
  assert.strictEqual(lastPost.body.body, '标题\n加粗 链接');
});

test('send：html 类型转为纯文本', async () => {
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app', deviceKey: 'k' }, 1);
  await ch.send({ title: 'T', content: '<b>粗体</b>', type: 'html' });
  assert.strictEqual(lastPost.body.body, '粗体');
});

test('send：可选字段 group/sound/icon/level 被附加', async () => {
  const ch = new BarkChannel(
    { serverUrl: 'https://api.day.app', deviceKey: 'k', group: 'g', sound: 's', icon: 'http://i', level: 'critical' },
    1
  );
  await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.body.group, 'g');
  assert.strictEqual(lastPost.body.sound, 's');
  assert.strictEqual(lastPost.body.icon, 'http://i');
  assert.strictEqual(lastPost.body.level, 'critical');
});

test('send：业务 code !== 200 抛错', async () => {
  postImpl = () => Promise.resolve({ data: { code: 400, message: '昵称不存在' } });
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app', deviceKey: 'k' }, 1);
  await assert.rejects(() => ch.send({ title: 'T', content: 'C' }), /昵称不存在/);
});

test('_stripMarkdown：常见语法被剥离', () => {
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app', deviceKey: 'k' }, 1);
  assert.strictEqual(ch._stripMarkdown('## 标题\n**粗** *斜* `码`'), '标题\n粗 斜');
});

test('validate：必填项与 level 枚举', () => {
  const ch = new BarkChannel({ serverUrl: 'https://api.day.app', deviceKey: 'k' }, 1);
  assert.strictEqual(ch.validate({ serverUrl: '', deviceKey: 'k' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: 'not-url', deviceKey: 'k' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: 'https://x.com', deviceKey: '' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: 'https://x.com', deviceKey: 'k', level: 'bad' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: 'https://x.com', deviceKey: 'k' }).valid, true);
});
