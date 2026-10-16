/**
 * FeishuChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 text/markdown payload 构建、签名、业务状态码与校验逻辑。
 *
 * 注意：渠道特有分支（sendPost/sendImage 等）依赖 logger，已在源码中补全 require，
 * 此处一并覆盖其通用路径与特有消息分支。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { code: 0, msg: 'ok', data: { message_id: 'msg1' } } });
};
const axiosPath = require.resolve('axios');
delete require.cache[axiosPath];
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (url, body, config) => postImpl(url, body, config) },
};

const FeishuChannel = require('../../../src/services/channels/feishu.channel');

const URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx';

beforeEach(() => {
  lastPost = null;
  postImpl = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { code: 0, msg: 'ok', data: { message_id: 'msg1' } } });
  };
});

test('send：text 类型带标题拼接内容', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  const res = await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, URL);
  assert.strictEqual(lastPost.body.msg_type, 'text');
  assert.strictEqual(lastPost.body.content.text, 'T\n\nC');
  assert.deepStrictEqual(res, { success: true, messageId: 'msg1' });
});

test('send：text 类型无标题仅内容', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastPost.body.content.text, 'C');
});

test('send：html 类型剥离标签转为 text', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await ch.send({ content: '<p>hi <b>there</b></p>', type: 'html' });
  assert.strictEqual(lastPost.body.msg_type, 'text');
  assert.ok(!lastPost.body.content.text.includes('<'));
  assert.ok(lastPost.body.content.text.includes('hi'));
});

test('send：markdown 类型构建 interactive 卡片', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await ch.send({ title: 'T', content: 'C', type: 'markdown' });
  assert.strictEqual(lastPost.body.msg_type, 'interactive');
  assert.strictEqual(lastPost.body.card.header.title.content, 'T');
  assert.strictEqual(lastPost.body.card.elements[0].text.content, 'C');
});

test('send：markdown 无标题使用默认标题', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await ch.send({ content: 'C', type: 'markdown' });
  assert.strictEqual(lastPost.body.card.header.title.content, '消息通知');
});

test('send：无 secret 时 sign 为空字符串', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await ch.send({ content: 'C' });
  assert.strictEqual(lastPost.body.sign, '');
  assert.ok(typeof lastPost.body.timestamp === 'number');
});

test('generateSign：有 secret 时可复算', () => {
  const secret = 'SEC';
  const ch = new FeishuChannel({ webhookUrl: URL, secret });
  const ts = 1700000000;
  const expected = crypto.createHmac('sha256', `${ts}\n${secret}`).digest('base64');
  assert.strictEqual(ch.generateSign(ts), expected);
});

test('generateSign：无 secret 返回空字符串', () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  assert.strictEqual(ch.generateSign(123), '');
});

test('send：业务 code !== 0 抛错', async () => {
  postImpl = () => Promise.resolve({ data: { code: 19021, msg: 'sign match fail' } });
  const ch = new FeishuChannel({ webhookUrl: URL });
  await assert.rejects(() => ch.send({ content: 'C' }), /飞书发送失败: sign match fail/);
});

test('send：成功但无 data 时 messageId 为 null', async () => {
  postImpl = () => Promise.resolve({ data: { code: 0, msg: 'ok' } });
  const ch = new FeishuChannel({ webhookUrl: URL });
  const res = await ch.send({ content: 'C' });
  assert.strictEqual(res.messageId, null);
});

test('sendChannelSpecific：未知类型抛错', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await assert.rejects(
    () => ch.send({ channelType: 'unknown', extraData: {} }),
    /不支持的渠道特有类型: unknown/
  );
});

test('validate：webhook 必填与前缀校验', () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  assert.strictEqual(ch.validate({ webhookUrl: '' }).valid, false);
  assert.strictEqual(ch.validate({ webhookUrl: '   ' }).valid, false);
  assert.strictEqual(ch.validate({ webhookUrl: 'https://example.com/x' }).valid, false);
  assert.strictEqual(ch.validate({ webhookUrl: URL }).valid, true);
});

// ---- 渠道特有分支（修复 logger 缺失后可测） ----

test('sendPost：构建签名 payload 并补全默认标题', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  const res = await ch.send({
    channelType: 'post',
    extraData: { content: [[{ tag: 'text', text: 'hi' }]] },
  });
  assert.strictEqual(lastPost.body.msg_type, 'post');
  assert.strictEqual(lastPost.body.post.zh_cn.title, '消息通知');
  assert.deepStrictEqual(lastPost.body.post.zh_cn.content, [[{ tag: 'text', text: 'hi' }]]);
  assert.strictEqual(res.type, 'post');
});

test('sendPost：缺 content 抛错', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await assert.rejects(
    () => ch.send({ channelType: 'post', extraData: {} }),
    /富文本消息必须包含 content（内容数组）/
  );
});

test('sendImage：image_key 路径构建 payload', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  const res = await ch.send({ channelType: 'image', extraData: { image_key: 'IMG' } });
  assert.strictEqual(lastPost.body.msg_type, 'image');
  assert.strictEqual(lastPost.body.image.image_key, 'IMG');
  assert.strictEqual(res.type, 'image');
});

test('sendImage：base64 路径拼接 data URL', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await ch.send({ channelType: 'image', extraData: { base64: 'BASE64' } });
  assert.strictEqual(lastPost.body.image.image_content, 'data:image/png;base64,BASE64');
});

test('sendImage：缺 image_key/base64 抛错', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await assert.rejects(
    () => ch.send({ channelType: 'image', extraData: {} }),
    /图片消息必须包含 image_key 或 base64 数据/
  );
});

test('sendInteractiveCard：构建 payload', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  const card = { header: { title: { content: 't' } } };
  const res = await ch.send({ channelType: 'interactive_card', extraData: { card } });
  assert.strictEqual(lastPost.body.msg_type, 'interactive');
  assert.deepStrictEqual(lastPost.body.card, card);
  assert.strictEqual(res.type, 'interactive_card');
});

test('sendInteractiveCard：缺 card 抛错', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await assert.rejects(
    () => ch.send({ channelType: 'interactive_card', extraData: {} }),
    /交互卡片必须包含 card（卡片对象）/
  );
});

test('sendShareChat：构建 share_chat payload', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  const res = await ch.send({ channelType: 'share_chat', extraData: { share_chat_id: 'oc_1' } });
  assert.strictEqual(lastPost.body.msg_type, 'share_chat');
  assert.ok(!lastPost.body.content);
  assert.deepStrictEqual(lastPost.body.share_chat, { share_chat_id: 'oc_1' });
  assert.strictEqual(res.type, 'share_chat');
});

test('sendShareChat：缺 share_chat_id 抛错', async () => {
  const ch = new FeishuChannel({ webhookUrl: URL });
  await assert.rejects(
    () => ch.send({ channelType: 'share_chat', extraData: {} }),
    /群名片分享必须包含 share_chat_id/
  );
});
