/**
 * WebhookChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock（webhook 使用 axios(config) 形式），
 * 验证 Body/Header 模板渲染、JSON 解析回退、校验逻辑及发送请求构造。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

let lastConfig = null;
let impl = (config) => {
  lastConfig = config;
  return Promise.resolve({ status: 200, statusText: 'OK', headers: { 'x-request-id': 'req-1' }, data: { ok: true } });
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: (config) => impl(config),
};

const WebhookChannel = require('../../../src/services/channels/webhook.channel');

beforeEach(() => {
  lastConfig = null;
});

test('renderBody：无模板时使用默认 JSON 结构', () => {
  const ch = new WebhookChannel({ url: 'https://example.com/h' });
  const body = ch.renderBody({ title: 'T', content: 'C', type: 'markdown' });
  assert.strictEqual(body.title, 'T');
  assert.strictEqual(body.content, 'C');
  assert.strictEqual(body.type, 'markdown');
  assert.strictEqual(typeof body.timestamp, 'string');
});

test('renderBody：模板变量替换', () => {
  const ch = new WebhookChannel({
    url: 'https://example.com/h',
    bodyTemplate: '{"title":"{{title}}","content":"{{content}}"}',
  });
  const body = ch.renderBody({ title: '警报', content: 'CPU 高', type: 'text' });
  assert.strictEqual(body.title, '警报');
  assert.strictEqual(body.content, 'CPU 高');
});

test('renderBody：变量值做 JSON 转义（引号/反斜杠/换行）', () => {
  const ch = new WebhookChannel({
    url: 'u',
    bodyTemplate: '{"content":"{{content}}"}',
  });
  const body = ch.renderBody({ content: '他说 "hi"\n换行', type: 'text' });
  assert.strictEqual(body.content, '他说 "hi"\n换行');
});

test('renderBody：模板非法 JSON 时回退默认结构并标记错误', () => {
  const ch = new WebhookChannel({ url: 'u', bodyTemplate: '{"bad": }' });
  const body = ch.renderBody({ title: 'T', content: 'C' });
  assert.strictEqual(body._templateError, 'Body 模板格式错误，已使用默认格式');
  assert.strictEqual(body.title, 'T');
  assert.strictEqual(body.content, 'C');
});

test('renderHeaders：Header 模板变量替换', () => {
  const ch = new WebhookChannel({
    url: 'u',
    headers: { 'X-Title': '{{title}}', Authorization: 'Bearer {{content}}' },
  });
  const h = ch.renderHeaders({ title: 'MyTitle', content: 'tok', type: 'text' });
  assert.strictEqual(h['X-Title'], 'MyTitle');
  assert.strictEqual(h['Authorization'], 'Bearer tok');
});

test('validate：URL/方法/Headers 校验', () => {
  const ch = new WebhookChannel({ url: 'https://example.com/h' });
  assert.strictEqual(ch.validate({ url: '' }).valid, false);
  assert.strictEqual(ch.validate({ url: 'not-a-url' }).valid, false);
  assert.strictEqual(ch.validate({ url: 'https://x.com', method: 'DELETE' }).valid, false);
  assert.strictEqual(ch.validate({ url: 'https://x.com', headers: 'bad' }).valid, false);
  assert.strictEqual(ch.validate({ url: 'https://x.com' }).valid, true);
  assert.strictEqual(ch.validate({ url: 'https://x.com', method: 'put' }).valid, true);
});

test('send：POST 默认将 Body 放入 data', async () => {
  const ch = new WebhookChannel({ url: 'https://example.com/h', method: 'POST' });
  const res = await ch.send({ title: 'T', content: 'C', type: 'text' });
  assert.strictEqual(lastConfig.url, 'https://example.com/h');
  assert.strictEqual(lastConfig.method, 'POST');
  assert.strictEqual(lastConfig.data.title, 'T');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.messageId, 'req-1');
});

test('send：GET 方法将 Body 放入 params', async () => {
  const ch = new WebhookChannel({ url: 'u', method: 'get' });
  await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastConfig.method, 'GET');
  assert.ok(lastConfig.params);
  assert.strictEqual(lastConfig.data, undefined);
});

test('send：请求失败抛出包装错误', async () => {
  impl = () => Promise.reject({ response: { data: { message: 'boom' } } });
  const ch = new WebhookChannel({ url: 'u' });
  await assert.rejects(() => ch.send({ title: 'T', content: 'C' }), /Webhook 发送失败/);
});
