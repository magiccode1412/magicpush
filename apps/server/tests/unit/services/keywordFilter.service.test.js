/**
 * KeywordFilterService 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 覆盖：未启用放行、黑名单命中拦截、白名单未命中拦截、空关键词跳过、大小写不敏感。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const KeywordFilterService = require('../../../src/services/keywordFilter.service');

test('未启用时直接放行', () => {
  const r1 = KeywordFilterService.check(null, { title: 'x', content: 'y' });
  const r2 = KeywordFilterService.check({ enabled: false, keywords: ['a'] }, { title: 'x', content: 'y' });
  const r3 = KeywordFilterService.check({ enabled: true, keywords: [] }, { title: 'x', content: 'y' });
  assert.deepStrictEqual(r1, { blocked: false });
  assert.deepStrictEqual(r2, { blocked: false });
  assert.deepStrictEqual(r3, { blocked: false });
});

test('黑名单命中关键词 → 拦截', () => {
  const config = { enabled: true, mode: 'blacklist', keywords: ['暴力', '广告'] };
  const r = KeywordFilterService.check(config, { title: '促销', content: '这是广告内容' });
  assert.strictEqual(r.blocked, true);
  assert.strictEqual(r.mode, 'blacklist');
  assert.strictEqual(r.matchedKeyword, '广告');
});

test('黑名单未命中 → 放行', () => {
  const config = { enabled: true, mode: 'blacklist', keywords: ['暴力'] };
  const r = KeywordFilterService.check(config, { title: '你好', content: '正常消息' });
  assert.strictEqual(r.blocked, false);
});

test('白名单命中任一关键词 → 放行', () => {
  const config = { enabled: true, mode: 'whitelist', keywords: ['通知', '告警'] };
  const r = KeywordFilterService.check(config, { title: '系统告警', content: 'x' });
  assert.strictEqual(r.blocked, false);
});

test('白名单未命中任何关键词 → 拦截', () => {
  const config = { enabled: true, mode: 'whitelist', keywords: ['通知', '告警'] };
  const r = KeywordFilterService.check(config, { title: '闲聊', content: '随便聊聊' });
  assert.strictEqual(r.blocked, true);
  assert.strictEqual(r.mode, 'whitelist');
});

test('空关键词被跳过', () => {
  const config = { enabled: true, mode: 'blacklist', keywords: ['  ', '广告', ''] };
  const r = KeywordFilterService.check(config, { title: 'x', content: '这里是广告' });
  assert.strictEqual(r.blocked, true);
  assert.strictEqual(r.matchedKeyword, '广告');
});

test('匹配对大小写不敏感（文本与关键词均转小写）', () => {
  const config = { enabled: true, mode: 'blacklist', keywords: ['SPAM'] };
  const r = KeywordFilterService.check(config, { title: 'x', content: '这是 Spam 消息' });
  assert.strictEqual(r.blocked, true);
  assert.strictEqual(r.matchedKeyword, 'SPAM');
});
