/**
 * TelegramChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 apiUrl 构建、通用 text/markdown/html 消息、渠道特有类型
 * （photo/document/location）payload 与校验逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { ok: true, result: { message_id: 'mid' } } });
};
const axiosPath = require.resolve('axios');
delete require.cache[axiosPath];
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (...a) => postImpl(...a) },
};

const TelegramChannel = require('../../../src/services/channels/telegram.channel');

const TOKEN = 'bot123:secret';
const CHAT = '-1001';

beforeEach(() => {
  lastPost = null;
  postImpl = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { ok: true, result: { message_id: 'mid' } } });
  };
});

test('构造：apiUrl 由 botToken 拼接', () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  assert.strictEqual(ch.apiUrl, `https://api.telegram.org/bot${TOKEN}`);
});

test('send：text 类型带标题加粗', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, `https://api.telegram.org/bot${TOKEN}/sendMessage`);
  assert.strictEqual(lastPost.body.text, '<b>T</b>\n\nC');
  assert.strictEqual(lastPost.body.parse_mode, 'HTML');
});

test('send：markdown 类型加星号标题', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await ch.send({ title: 'T', content: 'C', type: 'markdown' });
  assert.strictEqual(lastPost.body.text, '*T*\n\nC');
  assert.strictEqual(lastPost.body.parse_mode, 'Markdown');
});

test('send：html 类型视为 HTML parse_mode', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await ch.send({ title: 'T', content: 'C', type: 'html' });
  assert.strictEqual(lastPost.body.parse_mode, 'HTML');
});

test('send：业务 ok !== true 抛错', async () => {
  postImpl = () => Promise.resolve({ data: { ok: false, description: 'bad request' } });
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await assert.rejects(() => ch.send({ content: 'C' }), /Telegram发送失败: bad request/);
});

test('sendChannelSpecific：未知类型抛错', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await assert.rejects(
    () => ch.send({ channelType: 'unknown', extraData: {} }),
    /不支持的渠道特有类型: unknown/
  );
});

test('sendPhoto：url 路径构建 payload', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  const res = await ch.send({ channelType: 'photo', extraData: { url: 'https://img/x.png', caption: 'cap' } });
  assert.strictEqual(lastPost.url, `https://api.telegram.org/bot${TOKEN}/sendPhoto`);
  assert.strictEqual(lastPost.body.photo, 'https://img/x.png');
  assert.strictEqual(lastPost.body.caption, 'cap');
  assert.strictEqual(res.type, 'photo');
});

test('sendPhoto：base64 路径发送 FormData', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await ch.send({ channelType: 'photo', extraData: { base64: 'QUJD', filename: 'p.jpg' } });
  assert.ok(lastPost.body); // FormData 实例
  assert.strictEqual(lastPost.url, `https://api.telegram.org/bot${TOKEN}/sendPhoto`);
});

test('sendPhoto：缺 url/base64 抛错', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await assert.rejects(
    () => ch.send({ channelType: 'photo', extraData: {} }),
    /图片消息必须包含 url 或 base64 数据/
  );
});

test('sendDocument：url 路径构建 payload', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  const res = await ch.send({ channelType: 'document', extraData: { url: 'https://f/r.pdf', caption: 'c' } });
  assert.strictEqual(lastPost.body.document, 'https://f/r.pdf');
  assert.strictEqual(res.type, 'document');
});

test('sendLocation：构建经纬度 payload', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  const res = await ch.send({ channelType: 'location', extraData: { latitude: 39.9, longitude: 116.4, title: '广场' } });
  assert.strictEqual(lastPost.body.latitude, 39.9);
  assert.strictEqual(lastPost.body.longitude, 116.4);
  assert.strictEqual(lastPost.body.title, '广场');
  assert.strictEqual(res.type, 'location');
});

test('sendLocation：缺经纬度抛错', async () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  await assert.rejects(
    () => ch.send({ channelType: 'location', extraData: {} }),
    /位置消息必须包含 latitude（纬度）和 longitude（经度）/
  );
});

test('validate：botToken / chatId 必填', () => {
  const ch = new TelegramChannel({ botToken: TOKEN, chatId: CHAT });
  assert.strictEqual(ch.validate({ botToken: '', chatId: 'x' }).valid, false);
  assert.strictEqual(ch.validate({ botToken: 't', chatId: '' }).valid, false);
  assert.strictEqual(ch.validate({ botToken: TOKEN, chatId: CHAT }).valid, true);
});
