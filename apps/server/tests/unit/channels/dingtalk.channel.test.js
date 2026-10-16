/**
 * DingtalkChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 text/markdown payload 构建、加签 URL 拼接、业务状态码与校验逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { errcode: 0, errmsg: 'ok' } });
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (url, body, config) => postImpl(url, body, config) },
};

const DingtalkChannel = require('../../../src/services/channels/dingtalk.channel');

const BASE_URL = 'https://oapi.dingtalk.com/robot/send?access_token=abc';

beforeEach(() => {
  lastPost = null;
  postImpl = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { errcode: 0, errmsg: 'ok' } });
  };
});

test('send：text 类型带标题拼接内容', async () => {
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  const res = await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, BASE_URL);
  assert.strictEqual(lastPost.body.msgtype, 'text');
  assert.strictEqual(lastPost.body.text.content, 'T\n\nC');
  assert.deepStrictEqual(res, { success: true, messageId: null });
});

test('send：text 类型无标题仅内容', async () => {
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastPost.body.text.content, 'C');
});

test('send：markdown 类型带标题', async () => {
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  await ch.send({ title: 'T', content: 'C', type: 'markdown' });
  assert.strictEqual(lastPost.body.msgtype, 'markdown');
  assert.strictEqual(lastPost.body.markdown.title, 'T');
  assert.strictEqual(lastPost.body.markdown.text, '# T\nC');
});

test('send：markdown 类型无标题使用默认标题', async () => {
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  await ch.send({ content: 'C', type: 'markdown' });
  assert.strictEqual(lastPost.body.markdown.title, '消息通知');
  assert.strictEqual(lastPost.body.markdown.text, 'C');
});

test('send：带 secret 时 URL 拼接 timestamp/sign 且签名可复算', async () => {
  const secret = 'SEC123';
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL, secret });
  await ch.send({ content: 'C' });
  const u = new URL(lastPost.url);
  const ts = u.searchParams.get('timestamp');
  const sign = u.searchParams.get('sign');
  assert.ok(ts && sign);
  // 复算签名进行核对
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}\n${secret}`)
    .digest('base64');
  assert.strictEqual(decodeURIComponent(sign), expected);
});

test('generateSign：无 secret 返回空字符串', () => {
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  assert.strictEqual(ch.generateSign(123), '');
});

test('send：业务 errcode !== 0 抛错', async () => {
  postImpl = () => Promise.resolve({ data: { errcode: 310000, errmsg: 'blocked' } });
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  await assert.rejects(() => ch.send({ content: 'C' }), /钉钉发送失败: blocked/);
});

test('validate：webhook 必填与前缀校验', () => {
  const ch = new DingtalkChannel({ webhookUrl: BASE_URL });
  assert.strictEqual(ch.validate({ webhookUrl: '' }).valid, false);
  assert.strictEqual(ch.validate({ webhookUrl: '   ' }).valid, false);
  assert.strictEqual(ch.validate({ webhookUrl: 'https://example.com/x' }).valid, false);
  assert.strictEqual(ch.validate({ webhookUrl: BASE_URL }).valid, true);
});
