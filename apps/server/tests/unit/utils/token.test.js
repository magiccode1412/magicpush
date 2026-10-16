/**
 * TokenUtil 单元测试（基于 Node 内置 node:test，无第三方依赖）
 *
 * 通过 process.env.JWT_SECRET 绕过数据库依赖，验证 parseExpiresIn 与
 * generateTokens / verifyToken 的往返一致性。
 */
const { test, before } = require('node:test');
const assert = require('node:assert');
const TokenUtil = require('../../../src/utils/token');

// 在加载任何可能缓存密钥的逻辑前设置测试密钥，避免命中 DB
before(() => {
  process.env.JWT_SECRET = 'test-secret-for-unit-test';
});

test('parseExpiresIn：解析各时间单位', () => {
  assert.strictEqual(TokenUtil.parseExpiresIn('30s'), 30);
  assert.strictEqual(TokenUtil.parseExpiresIn('15m'), 900);
  assert.strictEqual(TokenUtil.parseExpiresIn('2h'), 7200);
  assert.strictEqual(TokenUtil.parseExpiresIn('7d'), 604800);
});

test('parseExpiresIn：非法格式回退默认 900', () => {
  assert.strictEqual(TokenUtil.parseExpiresIn('abc'), 900);
  assert.strictEqual(TokenUtil.parseExpiresIn('10x'), 900);
  assert.strictEqual(TokenUtil.parseExpiresIn(''), 900);
});

test('generateTokens / verifyToken 往返一致', () => {
  const tokens = TokenUtil.generateTokens({ userId: 42, role: 'admin' });
  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);
  assert.strictEqual(tokens.expiresIn, 900);

  const decoded = TokenUtil.verifyToken(tokens.accessToken);
  assert.strictEqual(decoded.userId, 42);
  assert.strictEqual(decoded.role, 'admin');

  const refreshDecoded = TokenUtil.verifyToken(tokens.refreshToken);
  assert.strictEqual(refreshDecoded.userId, 42);
  assert.ok(typeof refreshDecoded.jti === 'string' && refreshDecoded.jti.length > 0);
});

test('verifyToken：非法令牌返回 null', () => {
  assert.strictEqual(TokenUtil.verifyToken('not-a-valid-token'), null);
});

test('decodeToken：不验证即可解析载荷', () => {
  const tokens = TokenUtil.generateTokens({ userId: 1 });
  const payload = TokenUtil.decodeToken(tokens.accessToken);
  assert.strictEqual(payload.userId, 1);
});
