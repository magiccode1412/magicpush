/**
 * GotifyChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 serverUrl 规范化、priority 边界裁剪、文本/html/markdown/url 转换、
 * 业务返回值透传与校验逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { id: 1, message: 'ok' } });
};
const axiosPath = require.resolve('axios');
delete require.cache[axiosPath];
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (...a) => postImpl(...a) },
};

const GotifyChannel = require('../../../src/services/channels/gotify.channel');

const URL = 'https://gotify.example.com/';

beforeEach(() => {
  lastPost = null;
  postImpl = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { id: 1, message: 'ok' } });
  };
});

test('构造：serverUrl 去除尾部斜杠', () => {
  const ch = new GotifyChannel({ serverUrl: 'https://gotify.example.com///', appToken: 't' });
  assert.strictEqual(ch.serverUrl, 'https://gotify.example.com');
});

test('构造：priority 越界回退默认 5', () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't', priority: 99 });
  assert.strictEqual(ch.priority, 5);
});

test('构造：priority 合法值保留', () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't', priority: 8 });
  assert.strictEqual(ch.priority, 8);
  const ch2 = new GotifyChannel({ serverUrl: URL, appToken: 't', priority: 'abc' });
  assert.strictEqual(ch2.priority, 5);
});

test('send：text 类型构建 body 与鉴权头', async () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 'tok', priority: 3 });
  const res = await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, 'https://gotify.example.com/message');
  assert.strictEqual(lastPost.body.title, 'T');
  assert.strictEqual(lastPost.body.message, 'C');
  assert.strictEqual(lastPost.body.priority, 3);
  assert.strictEqual(lastPost.config.headers['X-Gotify-Key'], 'tok');
  assert.deepStrictEqual(res, { id: 1, message: 'ok' });
});

test('send：无标题时 title 为 undefined', async () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't' });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastPost.body.title, undefined);
});

test('send：html 类型剥离标签', async () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't' });
  await ch.send({ content: '<p>hi <b>x</b></p>', type: 'html' });
  assert.ok(!lastPost.body.message.includes('<'));
});

test('send：markdown 类型附加 client::display extras', async () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't' });
  await ch.send({ content: 'C', type: 'markdown' });
  assert.deepStrictEqual(lastPost.body.extras['client::display'], { contentType: 'text/markdown' });
});

test('send：带 url 附加 click extras', async () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't' });
  await ch.send({ content: 'C', url: 'https://x.com' });
  assert.deepStrictEqual(lastPost.body.extras['client::notification::click'], { url: 'https://x.com' });
});

test('validate：serverUrl / appToken 必填与格式', () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't' });
  assert.strictEqual(ch.validate({ serverUrl: '', appToken: 't' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: 'not-a-url', appToken: 't' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: URL, appToken: '' }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: URL, appToken: 't' }).valid, true);
});

test('validate：priority 越界报错', () => {
  const ch = new GotifyChannel({ serverUrl: URL, appToken: 't' });
  assert.strictEqual(ch.validate({ serverUrl: URL, appToken: 't', priority: 11 }).valid, false);
  assert.strictEqual(ch.validate({ serverUrl: URL, appToken: 't', priority: 5 }).valid, true);
});
