/**
 * ServerChanChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 Turbo/³ 双版本 API 地址构建、可选参数、业务状态码与校验逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { code: 0, data: { pushid: 'p1' } } });
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (url, body, config) => postImpl(url, body, config) },
};

const ServerChanChannel = require('../../../src/services/channels/serverchan.channel');

beforeEach(() => {
  lastPost = null;
});

test('构造：Turbo 版 API 地址', () => {
  const ch = new ServerChanChannel({ version: 'turbo', sendKey: 'SCT123' });
  assert.strictEqual(ch.apiUrl, 'https://sctapi.ftqq.com/SCT123.send');
});

test('构造：³ 版从 sendKey 解析 uid 拼接地址', () => {
  const ch = new ServerChanChannel({ version: 'v3', sendKey: 'sctp3289tabcdef' });
  assert.strictEqual(ch.apiUrl, 'https://3289.push.ft07.com/send/sctp3289tabcdef.send');
});

test('构造：³ 版 sendKey 格式错误抛错', () => {
  assert.throws(
    () => new ServerChanChannel({ version: 'v3', sendKey: 'badformat' }),
    /³版SendKey格式错误/
  );
});

test('send：Turbo 版表单提交并解析 pushid', async () => {
  const ch = new ServerChanChannel({ version: 'turbo', sendKey: 'SCT1' });
  const res = await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, 'https://sctapi.ftqq.com/SCT1.send');
  assert.strictEqual(lastPost.body.title, 'T');
  assert.strictEqual(lastPost.body.desp, 'C');
  assert.strictEqual(lastPost.config.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.strictEqual(res.messageId, 'p1');
  assert.strictEqual(res.success, true);
});

test('send：Turbo 版附加 channel/openid/noip', async () => {
  const ch = new ServerChanChannel({ version: 'turbo', sendKey: 'SCT1', channel: '9', openid: 'o1', noip: true });
  await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.body.channel, '9');
  assert.strictEqual(lastPost.body.openid, 'o1');
  assert.strictEqual(lastPost.body.noip, true);
});

test('send：³ 版 JSON 提交并支持 tags/short', async () => {
  const ch = new ServerChanChannel({ version: 'v3', sendKey: 'sctp1tabc', tags: 'a|b', short: 's' });
  await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, 'https://1.push.ft07.com/send/sctp1tabc.send');
  assert.strictEqual(lastPost.config.headers['Content-Type'], 'application/json;charset=utf-8');
  assert.strictEqual(lastPost.body.tags, 'a|b');
  assert.strictEqual(lastPost.body.short, 's');
});

test('send：业务 code !== 0 抛错', async () => {
  postImpl = () => Promise.resolve({ data: { code: 1, message: 'fail' } });
  const ch = new ServerChanChannel({ version: 'turbo', sendKey: 'SCT1' });
  await assert.rejects(() => ch.send({ title: 'T', content: 'C' }), /Server酱发送失败/);
});

test('validate：sendKey 必填与³版格式', () => {
  const ch = new ServerChanChannel({ version: 'turbo', sendKey: 'SCT1' });
  assert.strictEqual(ch.validate({ sendKey: '' }).valid, false);
  assert.strictEqual(ch.validate({ version: 'v3', sendKey: 'bad' }).valid, false);
  assert.strictEqual(ch.validate({ version: 'v3', sendKey: 'sctp3289tabc' }).valid, true);
  assert.strictEqual(ch.validate({ sendKey: 'SCT1' }).valid, true);
});
