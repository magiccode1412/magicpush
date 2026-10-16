/**
 * BaseChannel 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 覆盖：stripHtmlTags（HTML 转纯文本）与 createProxyAgent（代理 agent 创建）。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const BaseChannel = require('../../../src/services/channels/base.channel');

test('stripHtmlTags：去除标签并保留换行', () => {
  const input = '<div>Hello</div><p>World</p>';
  assert.strictEqual(BaseChannel.stripHtmlTags(input), 'Hello\nWorld');
});

test('stripHtmlTags：<br> 转为换行', () => {
  assert.strictEqual(BaseChannel.stripHtmlTags('a<br>b<br/>c'), 'a\nb\nc');
});

test('stripHtmlTags：解码常见 HTML 实体', () => {
  const input = '&lt;div&gt; &amp; &quot;x&quot; &#39;y&#39; &nbsp;z';
  assert.strictEqual(BaseChannel.stripHtmlTags(input), '<div> & "x" \'y\' z');
});

test('stripHtmlTags：合并多余连续换行与空白', () => {
  const input = '<p>a</p>\n\n\n\n<p>b</p>    c';
  assert.strictEqual(BaseChannel.stripHtmlTags(input), 'a\n\nb\n c');
});

test('stripHtmlTags：非字符串输入安全降级', () => {
  assert.strictEqual(BaseChannel.stripHtmlTags(null), '');
  assert.strictEqual(BaseChannel.stripHtmlTags(undefined), '');
  assert.strictEqual(BaseChannel.stripHtmlTags(123), '123');
});

test('createProxyAgent：空/非法 URL 返回 null', () => {
  const channel = new BaseChannel({}, 1);
  assert.strictEqual(channel.createProxyAgent(''), null);
  assert.strictEqual(channel.createProxyAgent(null), null);
  assert.strictEqual(channel.createProxyAgent('   '), null);
  assert.strictEqual(channel.createProxyAgent('not-a-url'), null);
});

test('createProxyAgent：HTTP 代理返回 HttpsProxyAgent', () => {
  const channel = new BaseChannel({}, 1);
  const agent = channel.createProxyAgent('http://127.0.0.1:7890');
  assert.ok(agent);
  assert.strictEqual(agent.constructor.name, 'HttpsProxyAgent');
});

test('createProxyAgent：SOCKS 代理返回 SocksProxyAgent', () => {
  const channel = new BaseChannel({}, 1);
  const agent = channel.createProxyAgent('socks5://user:pass@127.0.0.1:1080');
  assert.ok(agent);
  assert.strictEqual(agent.constructor.name, 'SocksProxyAgent');
});
