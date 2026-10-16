/**
 * WecomChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过覆盖 require.cache 中的 axios 注入 Mock，
 * 验证 webhookUrl 构建、text/markdown/html payload、渠道特有类型
 * （news/markdown_v2/template_card）、业务状态码与校验逻辑。
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

let lastPost = null;
let postImpl = (url, body, config) => {
  lastPost = { url, body, config };
  return Promise.resolve({ data: { errcode: 0, errmsg: 'ok', msgid: 'm1' } });
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: { post: (url, body, config) => postImpl(url, body, config) },
};

const WecomChannel = require('../../../src/services/channels/wecom.channel');

const KEY = 'abc-def';
const FULL_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc-def';

beforeEach(() => {
  lastPost = null;
  postImpl = (url, body, config) => {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { errcode: 0, errmsg: 'ok', msgid: 'm1' } });
  };
});

test('构造：裸 key 拼接为完整 webhookUrl', () => {
  const ch = new WecomChannel({ key: KEY });
  assert.strictEqual(ch.webhookUrl, FULL_URL);
});

test('构造：传入完整 URL 直接使用', () => {
  const ch = new WecomChannel({ key: `  ${FULL_URL}  ` });
  assert.strictEqual(ch.webhookUrl, FULL_URL);
});

test('send：text 类型带标题', async () => {
  const ch = new WecomChannel({ key: KEY });
  const res = await ch.send({ title: 'T', content: 'C' });
  assert.strictEqual(lastPost.url, FULL_URL);
  assert.strictEqual(lastPost.body.msgtype, 'text');
  assert.strictEqual(lastPost.body.text.content, 'T\n\nC');
  assert.deepStrictEqual(res, { success: true, messageId: 'm1' });
});

test('send：markdown 类型带标题拼接 #', async () => {
  const ch = new WecomChannel({ key: KEY });
  await ch.send({ title: 'T', content: 'C', type: 'markdown' });
  assert.strictEqual(lastPost.body.msgtype, 'markdown');
  assert.strictEqual(lastPost.body.markdown.content, '# T\nC');
});

test('send：html 类型降级为纯文本', async () => {
  const ch = new WecomChannel({ key: KEY });
  await ch.send({ title: 'T', content: '<p>hi <b>there</b></p>', type: 'html' });
  assert.strictEqual(lastPost.body.msgtype, 'text');
  assert.ok(!lastPost.body.text.content.includes('<'));
  assert.ok(lastPost.body.text.content.includes('hi'));
  assert.ok(lastPost.body.text.content.includes('there'));
});

test('send：业务 errcode !== 0 抛错', async () => {
  postImpl = () => Promise.resolve({ data: { errcode: 93000, errmsg: 'invalid key' } });
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(() => ch.send({ content: 'C' }), /企业微信发送失败: invalid key/);
});

test('sendNews：构建图文 payload 并补全默认字段', async () => {
  const ch = new WecomChannel({ key: KEY });
  const res = await ch.send({
    channelType: 'news',
    extraData: { articles: [{ title: 'A', url: 'https://x' }] },
  });
  assert.strictEqual(lastPost.body.msgtype, 'news');
  assert.deepStrictEqual(lastPost.body.news.articles[0], {
    title: 'A',
    description: '',
    url: 'https://x',
    picurl: '',
  });
  assert.strictEqual(res.type, 'news');
});

test('sendNews：缺 articles 抛错', async () => {
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(
    () => ch.send({ channelType: 'news', extraData: {} }),
    /图文消息必须包含 articles 数组/
  );
});

test('sendMarkdownV2：构建 payload', async () => {
  const ch = new WecomChannel({ key: KEY });
  await ch.send({ channelType: 'markdown_v2', extraData: { content: '| a | b |' } });
  assert.strictEqual(lastPost.body.msgtype, 'markdown_v2');
  assert.strictEqual(lastPost.body.markdown_v2.content, '| a | b |');
});

test('sendMarkdownV2：空内容抛错', async () => {
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(
    () => ch.send({ channelType: 'markdown_v2', extraData: {} }),
    /Markdown增强版消息必须包含 content 内容/
  );
});

test('sendImage：base64 内联构建 payload', async () => {
  const ch = new WecomChannel({ key: KEY });
  const res = await ch.send({ channelType: 'image', extraData: { base64: 'BASE64', md5: 'MD5' } });
  assert.strictEqual(lastPost.body.msgtype, 'image');
  assert.strictEqual(lastPost.body.image.base64, 'BASE64');
  assert.strictEqual(lastPost.body.image.md5, 'MD5');
  assert.strictEqual(res.type, 'image');
});

test('sendImage：缺 base64/url 抛错', async () => {
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(
    () => ch.send({ channelType: 'image', extraData: {} }),
    /图片消息必须提供 base64 或 url/
  );
});

test('sendFile：已有 media_id 直接构建 payload', async () => {
  const ch = new WecomChannel({ key: KEY });
  const res = await ch.send({ channelType: 'file', extraData: { media_id: 'MID' } });
  assert.strictEqual(lastPost.body.msgtype, 'file');
  assert.strictEqual(lastPost.body.file.media_id, 'MID');
  assert.strictEqual(res.type, 'file');
});

test('sendTemplateCard：合法卡片类型构建 payload', async () => {
  const ch = new WecomChannel({ key: KEY });
  const res = await ch.send({
    channelType: 'template_card',
    extraData: { card_type: 'text_notice', sub_title_text: 'sub' },
  });
  assert.strictEqual(lastPost.body.msgtype, 'template_card');
  assert.strictEqual(lastPost.body.template_card.card_type, 'text_notice');
  assert.strictEqual(lastPost.body.template_card.sub_title_text, 'sub');
  assert.strictEqual(res.type, 'template_card');
});

test('sendTemplateCard：缺 card_type 抛错', async () => {
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(
    () => ch.send({ channelType: 'template_card', extraData: {} }),
    /模板卡片必须指定 card_type/
  );
});

test('sendTemplateCard：非法 card_type 抛错', async () => {
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(
    () => ch.send({ channelType: 'template_card', extraData: { card_type: 'bad' } }),
    /不支持的卡片类型/
  );
});

test('sendChannelSpecific：未知类型抛错', async () => {
  const ch = new WecomChannel({ key: KEY });
  await assert.rejects(
    () => ch.send({ channelType: 'unknown', extraData: {} }),
    /不支持的渠道特有类型: unknown/
  );
});

test('validate：key 必填与 URL 中 key 参数校验', () => {
  const ch = new WecomChannel({ key: KEY });
  assert.strictEqual(ch.validate({ key: '' }).valid, false);
  assert.strictEqual(ch.validate({ key: '   ' }).valid, false);
  assert.strictEqual(ch.validate({ key: 'https://qyapi.weixin.qq.com/x?foo=1' }).valid, false);
  assert.strictEqual(ch.validate({ key: FULL_URL }).valid, true);
  assert.strictEqual(ch.validate({ key: KEY }).valid, true);
});
